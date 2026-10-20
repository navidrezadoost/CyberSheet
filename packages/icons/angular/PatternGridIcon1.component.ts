import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'pattern-grid-icon1',
  standalone: true,
  template: `
    <svg
      [attr.class]="className"
      [attr.width]="width"
      [attr.height]="height"
      [attr.fill]="fill"
      [attr.stroke]="stroke"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern [attr.id]="'pattern-' + pattern.type" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" [attr.fill]="backgroundColor" />
          <path [attr.d]="pattern.svgPattern" [attr.stroke]="foregroundColor" fill="none" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="24" height="24" [attr.fill]="'url(#pattern-' + pattern.type + ')'" />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatternGridIcon1Component {
  @Input() className: string = '';
  @Input() width: string | number = 24;
  @Input() height: string | number = 24;
  @Input() fill: string = 'currentColor';
  @Input() stroke: string = '';
  @Input() pattern: { type: string; svgPattern: string } = { type: 'default', svgPattern: '' };
  @Input() backgroundColor: string = '#FFFFFF';
  @Input() foregroundColor: string = '#000000';
}
