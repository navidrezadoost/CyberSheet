// Page checker - runs immediately to show which page you're on
(function() {
  const currentUrl = window.location.href;
  const currentPath = window.location.pathname;
  
  if (currentPath.includes('excel-app-demo.html')) {
    // CORRECT PAGE
    console.clear();
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50; font-weight: bold;');
    console.log('%c✅ CORRECT PAGE - ExcelApp Demo', 'background: #4CAF50; color: white; padding: 12px 20px; font-size: 20px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50; font-weight: bold;');
    console.log('%cURL: ' + currentUrl, 'color: #4CAF50; font-size: 14px;');
    console.log('%c🎨 In-cell editing is ENABLED on this page', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
    console.log('%c✨ Double-click any cell and you\'ll see a green edit overlay', 'color: #4CAF50; font-size: 14px;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50; font-weight: bold;');
    
    // Show browser alert
    setTimeout(() => {
      const message = '✅ CORRECT PAGE!\n\n' +
                     'You are on: ExcelApp Demo\n\n' +
                     'Double-click any cell to see the green edit overlay.\n\n' +
                     'URL: ' + currentUrl;
      alert(message);
    }, 500);
  } else {
    // WRONG PAGE
    console.clear();
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #f44336; font-weight: bold;');
    console.log('%c❌ WRONG PAGE - Canvas Viewer', 'background: #f44336; color: white; padding: 12px 20px; font-size: 20px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #f44336; font-weight: bold;');
    console.log('%cCurrent URL: ' + currentUrl, 'color: #ff9800; font-size: 14px;');
    console.log('%c⚠️ In-cell editing is NOT available on this page', 'color: #f44336; font-size: 16px; font-weight: bold;');
    console.log('%c', ''); // blank line
    console.log('%c🎯 COPY AND PASTE THIS URL INTO YOUR ADDRESS BAR:', 'color: #f44336; font-size: 16px; font-weight: bold;');
    console.log('%chttp://localhost:5174/examples/excel-app-demo.html', 'color: #2196F3; font-size: 18px; font-weight: bold; background: yellow; padding: 8px;');
    console.log('%c', ''); // blank line
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #f44336; font-weight: bold;');
    
    // Show browser alert
    setTimeout(() => {
      const correctUrl = 'http://localhost:5174/examples/excel-app-demo.html';
      const message = '❌ WRONG PAGE!\n\n' +
                     'You are viewing: Canvas Viewer (NO in-cell editing)\n' +
                     'Current URL: ' + currentUrl + '\n\n' +
                     '━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                     '✅ You need to navigate to:\n\n' +
                     correctUrl + '\n\n' +
                     '━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                     'COPY the correct URL above and PASTE it into your browser address bar.\n\n' +
                     'Click OK, then check the console for the correct URL (yellow background).';
      alert(message);
    }, 500);
  }
})();
