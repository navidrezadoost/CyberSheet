/**
 * Excel Comment Parser
 * 
 * Supports both legacy comments (comments1.xml + vmlDrawing) and modern threaded comments
 * 
 * Comment structure in XLSX:
 * - xl/comments1.xml - Comment text and metadata
 * - xl/drawings/vmlDrawing1.vml - Comment positioning/styling (legacy)
 * - xl/threadedComments/threadedComment1.xml - Modern threaded comments (Office 365+)
 */

import type { CellComment } from '@cyber-sheet/core';

export interface ExcelComment {
  /** Cell reference (e.g., "A1") */
  ref: string;
  /** Author name */
  author: string;
  /** Comment text */
  text: string;
  /** Parent comment ID for threaded replies */
  parentId?: string;
  /** Position (from VML drawing) */
  position?: { x: number; y: number };
  /** Size (from VML drawing) */
  size?: { width: number; height: number };
  /** Visibility */
  visible?: boolean;
}

/**
 * Parse comments from comments1.xml
 */
export class CommentParser {
  private authors: string[] = [];
  
  /**
   * Parse legacy comments from comments XML
   */
  parseComments(data: Uint8Array): Map<string, ExcelComment[]> {
    const comments = new Map<string, ExcelComment[]>();
    const decoder = new TextDecoder('utf-8');
    const xml = decoder.decode(data);
    
    // Parse authors list
    const authorsMatch = xml.match(/<authors>([\s\S]*?)<\/authors>/);
    if (authorsMatch) {
      const authorsXml = authorsMatch[1];
      const authorMatches = authorsXml.matchAll(/<author>([^<]*)<\/author>/g);
      for (const match of authorMatches) {
        this.authors.push(match[1]);
      }
    }
    
    // Parse comment list
    const commentListMatch = xml.match(/<commentList>([\s\S]*?)<\/commentList>/);
    if (!commentListMatch) return comments;
    
    const commentListXml = commentListMatch[1];
    const commentMatches = commentListXml.matchAll(/<comment\s+([^>]*)>([\s\S]*?)<\/comment>/g);
    
    for (const match of commentMatches) {
      const attrs = this.parseAttributes(match[1]);
      const content = match[2];
      
      const ref = attrs.ref || '';
      const authorId = parseInt(attrs.authorId || '0');
      const author = this.authors[authorId] || 'Unknown';
      
      // Extract text from <text> element
      const textMatch = content.match(/<text>([\s\S]*?)<\/text>/);
      let text = '';
      
      if (textMatch) {
        const textXml = textMatch[1];
        // Extract all <t> (text run) elements
        const tMatches = textXml.matchAll(/<t[^>]*>([^<]*)<\/t>/g);
        for (const tMatch of tMatches) {
          text += tMatch[1];
        }
      }
      
      const comment: ExcelComment = {
        ref,
        author,
        text: text.trim(),
      };
      
      if (!comments.has(ref)) {
        comments.set(ref, []);
      }
      comments.get(ref)!.push(comment);
    }
    
    return comments;
  }
  
  /**
   * Parse threaded comments (Office 365+)
   */
  parseThreadedComments(data: Uint8Array): Map<string, ExcelComment[]> {
    const comments = new Map<string, ExcelComment[]>();
    const decoder = new TextDecoder('utf-8');
    const xml = decoder.decode(data);
    
    const threadMatches = xml.matchAll(/<threadedComment\s+([^>]*)>([\s\S]*?)<\/threadedComment>/g);
    
    for (const match of threadMatches) {
      const attrs = this.parseAttributes(match[1]);
      const content = match[2];
      
      const ref = attrs.ref || '';
      const id = attrs.id || '';
      const parentId = attrs.parentId;
      
      // Extract display name
      const displayNameMatch = content.match(/<displayName>([^<]*)<\/displayName>/);
      const author = displayNameMatch ? displayNameMatch[1] : 'Unknown';
      
      // Extract text
      const textMatch = content.match(/<text>([^<]*)<\/text>/);
      const text = textMatch ? textMatch[1] : '';
      
      const comment: ExcelComment = {
        ref,
        author,
        text: text.trim(),
      };
      
      if (parentId) {
        comment.parentId = parentId;
      }
      
      if (!comments.has(ref)) {
        comments.set(ref, []);
      }
      comments.get(ref)!.push(comment);
    }
    
    return comments;
  }
  
  /**
   * Parse VML drawing for comment positioning
   */
  parseVmlDrawing(data: Uint8Array): Map<string, { position: { x: number; y: number }; size: { width: number; height: number } }> {
    const positions = new Map<string, { position: { x: number; y: number }; size: { width: number; height: number } }>();
    const decoder = new TextDecoder('utf-8');
    const xml = decoder.decode(data);
    
    // Parse <v:shape> elements
    const shapeMatches = xml.matchAll(/<v:shape\s+([^>]*)>([\s\S]*?)<\/v:shape>/g);
    
    for (const match of shapeMatches) {
      const attrs = this.parseAttributes(match[1]);
      const content = match[2];
      
      // Extract cell reference from ClientData
      const clientDataMatch = content.match(/<x:ClientData[^>]*>([\s\S]*?)<\/x:ClientData>/);
      if (!clientDataMatch) continue;
      
      const clientData = clientDataMatch[1];
      const rowMatch = clientData.match(/<x:Row>(\d+)<\/x:Row>/);
      const colMatch = clientData.match(/<x:Column>(\d+)<\/x:Column>/);
      
      if (!rowMatch || !colMatch) continue;
      
      const row = parseInt(rowMatch[1]) + 1; // Convert 0-based to 1-based
      const col = parseInt(colMatch[1]) + 1;
      const ref = this.numToCol(col) + row;
      
      // Parse position from style
      const style = attrs.style || '';
      const marginLeft = this.parseStyleValue(style, 'margin-left');
      const marginTop = this.parseStyleValue(style, 'margin-top');
      const width = this.parseStyleValue(style, 'width');
      const height = this.parseStyleValue(style, 'height');
      
      positions.set(ref, {
        position: { x: marginLeft || 0, y: marginTop || 0 },
        size: { width: width || 200, height: height || 100 },
      });
    }
    
    return positions;
  }
  
  /**
   * Convert CyberSheet comments to Excel XML format
   */
  generateCommentsXml(comments: Map<string, CellComment[]>): string {
    const authors = new Set<string>();
    
    // Collect unique authors
    for (const commentList of comments.values()) {
      for (const comment of commentList) {
        authors.add(comment.author);
      }
    }
    
    const authorArray = Array.from(authors);
    
    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    xml += '<comments xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n';
    
    // Authors
    xml += '  <authors>\n';
    for (const author of authorArray) {
      xml += `    <author>${this.escapeXml(author)}</author>\n`;
    }
    xml += '  </authors>\n';
    
    // Comment list
    xml += '  <commentList>\n';
    for (const [ref, commentList] of comments) {
      for (const comment of commentList) {
        const authorId = authorArray.indexOf(comment.author);
        xml += `    <comment ref="${ref}" authorId="${authorId}">\n`;
        xml += '      <text>\n';
        xml += `        <t>${this.escapeXml(comment.text)}</t>\n`;
        xml += '      </text>\n';
        xml += '    </comment>\n';
      }
    }
    xml += '  </commentList>\n';
    xml += '</comments>';
    
    return xml;
  }
  
  /**
   * Convert CyberSheet CellComment to ExcelComment
   */
  toExcelComment(ref: string, comment: CellComment): ExcelComment {
    return {
      ref,
      author: comment.author,
      text: comment.text,
      parentId: comment.parentId,
      position: comment.position,
    };
  }
  
  /**
   * Convert ExcelComment to CyberSheet CellComment
   */
  fromExcelComment(excelComment: ExcelComment): Omit<CellComment, 'id' | 'createdAt'> {
    return {
      text: excelComment.text,
      author: excelComment.author,
      parentId: excelComment.parentId,
      position: excelComment.position,
    };
  }
  
  // ==================== Helpers ====================
  
  private parseAttributes(attrString: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const matches = attrString.matchAll(/(\w+)="([^"]*)"/g);
    
    for (const match of matches) {
      attrs[match[1]] = match[2];
    }
    
    return attrs;
  }
  
  private parseStyleValue(style: string, property: string): number | null {
    const regex = new RegExp(`${property}:\\s*([\\d.]+)pt`, 'i');
    const match = style.match(regex);
    return match ? parseFloat(match[1]) : null;
  }
  
  private numToCol(num: number): string {
    let col = '';
    while (num > 0) {
      const rem = (num - 1) % 26;
      col = String.fromCharCode(65 + rem) + col;
      num = Math.floor((num - 1) / 26);
    }
    return col;
  }
  
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default CommentParser;
