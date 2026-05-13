/**
 * CSP-safe expression evaluator
 * Evaluates simple boolean/numeric expressions without using eval() or new Function()
 * 
 * Supports:
 * - Comparison: >, <, >=, <=, ==, !=
 * - Logical: &&, ||, !
 * - Arithmetic: +, -, *, /, %
 * - Parentheses for grouping
 */

type Token = 
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'operator'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' };

export class SafeExpressionEvaluator {
  private pos = 0;
  private tokens: Token[] = [];

  /**
   * Tokenize the expression
   */
  private tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    
    while (i < expr.length) {
      const char = expr[i];
      
      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }
      
      // Numbers
      if (/\d/.test(char)) {
        let num = '';
        while (i < expr.length && /[\d.]/.test(expr[i])) {
          num += expr[i++];
        }
        tokens.push({ type: 'number', value: parseFloat(num) });
        continue;
      }
      
      // String literals
      if (char === '"') {
        let str = '';
        i++; // skip opening quote
        while (i < expr.length && expr[i] !== '"') {
          if (expr[i] === '\\' && i + 1 < expr.length) {
            str += expr[i + 1];
            i += 2;
          } else {
            str += expr[i++];
          }
        }
        i++; // skip closing quote
        tokens.push({ type: 'string', value: str });
        continue;
      }
      
      // Boolean literals
      if (expr.substr(i, 4) === 'true') {
        tokens.push({ type: 'boolean', value: true });
        i += 4;
        continue;
      }
      if (expr.substr(i, 5) === 'false') {
        tokens.push({ type: 'boolean', value: false });
        i += 5;
        continue;
      }
      
      // Operators (check two-char operators first)
      if (i + 1 < expr.length) {
        const twoChar = expr.substr(i, 2);
        if (['==', '!=', '<=', '>=', '&&', '||'].includes(twoChar)) {
          tokens.push({ type: 'operator', value: twoChar });
          i += 2;
          continue;
        }
      }
      
      // Single-char operators
      if (['<', '>', '+', '-', '*', '/', '%', '!'].includes(char)) {
        tokens.push({ type: 'operator', value: char });
        i++;
        continue;
      }
      
      // Parentheses
      if (char === '(') {
        tokens.push({ type: 'lparen' });
        i++;
        continue;
      }
      if (char === ')') {
        tokens.push({ type: 'rparen' });
        i++;
        continue;
      }
      
      // Unknown character - skip it
      i++;
    }
    
    return tokens;
  }

  /**
   * Evaluate expression using recursive descent parser
   */
  evaluate(expression: string): boolean {
    this.tokens = this.tokenize(expression);
    this.pos = 0;
    
    if (this.tokens.length === 0) return false;
    
    const result = this.parseLogicalOr();
    return this.toBoolean(result);
  }

  private toBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    return false;
  }

  // Logical OR (lowest precedence)
  private parseLogicalOr(): any {
    let left = this.parseLogicalAnd();
    
    while (this.match('||')) {
      const right = this.parseLogicalAnd();
      left = this.toBoolean(left) || this.toBoolean(right);
    }
    
    return left;
  }

  // Logical AND
  private parseLogicalAnd(): any {
    let left = this.parseComparison();
    
    while (this.match('&&')) {
      const right = this.parseComparison();
      left = this.toBoolean(left) && this.toBoolean(right);
    }
    
    return left;
  }

  // Comparison operators
  private parseComparison(): any {
    let left = this.parseAdditive();
    
    if (this.match('==')) {
      const right = this.parseAdditive();
      return left === right;
    }
    if (this.match('!=')) {
      const right = this.parseAdditive();
      return left !== right;
    }
    if (this.match('<=')) {
      const right = this.parseAdditive();
      return Number(left) <= Number(right);
    }
    if (this.match('>=')) {
      const right = this.parseAdditive();
      return Number(left) >= Number(right);
    }
    if (this.match('<')) {
      const right = this.parseAdditive();
      return Number(left) < Number(right);
    }
    if (this.match('>')) {
      const right = this.parseAdditive();
      return Number(left) > Number(right);
    }
    
    return left;
  }

  // Addition and subtraction
  private parseAdditive(): any {
    let left = this.parseMultiplicative();
    
    while (true) {
      if (this.match('+')) {
        const right = this.parseMultiplicative();
        left = Number(left) + Number(right);
      } else if (this.match('-')) {
        const right = this.parseMultiplicative();
        left = Number(left) - Number(right);
      } else {
        break;
      }
    }
    
    return left;
  }

  // Multiplication, division, modulo
  private parseMultiplicative(): any {
    let left = this.parseUnary();
    
    while (true) {
      if (this.match('*')) {
        const right = this.parseUnary();
        left = Number(left) * Number(right);
      } else if (this.match('/')) {
        const right = this.parseUnary();
        left = Number(left) / Number(right);
      } else if (this.match('%')) {
        const right = this.parseUnary();
        left = Number(left) % Number(right);
      } else {
        break;
      }
    }
    
    return left;
  }

  // Unary operators
  private parseUnary(): any {
    if (this.match('!')) {
      const value = this.parseUnary();
      return !this.toBoolean(value);
    }
    if (this.match('-')) {
      const value = this.parseUnary();
      return -Number(value);
    }
    if (this.match('+')) {
      const value = this.parseUnary();
      return Number(value);
    }
    
    return this.parsePrimary();
  }

  // Primary expressions (literals, parentheses)
  private parsePrimary(): any {
    const token = this.tokens[this.pos];
    
    if (!token) return 0;
    
    if (token.type === 'number') {
      this.pos++;
      return token.value;
    }
    
    if (token.type === 'string') {
      this.pos++;
      return token.value;
    }
    
    if (token.type === 'boolean') {
      this.pos++;
      return token.value;
    }
    
    if (token.type === 'lparen') {
      this.pos++; // consume (
      const value = this.parseLogicalOr();
      this.match(''); // try to consume )
      return value;
    }
    
    // Unknown token
    this.pos++;
    return 0;
  }

  private match(op: string): boolean {
    const token = this.tokens[this.pos];
    
    if (op === '') {
      // Special case: consume rparen
      if (token?.type === 'rparen') {
        this.pos++;
        return true;
      }
      return false;
    }
    
    if (token?.type === 'operator' && token.value === op) {
      this.pos++;
      return true;
    }
    
    return false;
  }
}
