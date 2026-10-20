require('@angular/compiler');
require('jest-preset-angular/setup-env/zone').setupZoneTestEnv();

// JSDOM does not implement layout scrolling. Real browsers supply this API;
// the adapter's tests assert focus and state independently of scroll geometry.
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
}
