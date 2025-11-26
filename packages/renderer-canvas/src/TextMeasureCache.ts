export class TextMeasureCache {
  private cache = new Map<string, number>();
  private maxSize: number;
  constructor(maxSize = 5000) { this.maxSize = maxSize; }
  key(font: string, text: string) { return font + '|' + text; }
  get(font: string, text: string): number | undefined { return this.cache.get(this.key(font, text)); }
  set(font: string, text: string, width: number) {
    if (this.cache.size > this.maxSize) {
      // simple eviction: clear half
      const keys = Array.from(this.cache.keys());
      for (let i = 0; i < Math.floor(keys.length / 2); i++) this.cache.delete(keys[i]);
    }
    this.cache.set(this.key(font, text), width);
  }
}
