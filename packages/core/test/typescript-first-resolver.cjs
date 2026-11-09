const fs = require('node:fs');
const path = require('node:path');

const coreSourceRoot = path.resolve(__dirname, '../src');
const sourceExtensions = ['.ts', '.tsx'];
const javascriptExtensions = ['.js'];

function isWithin(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function hasGeneratedJavaScriptSibling(candidate) {
  for (const sourceExtension of sourceExtensions) {
    for (const javascriptExtension of javascriptExtensions) {
      if (
        fs.existsSync(`${candidate}${sourceExtension}`) &&
        fs.existsSync(`${candidate}${javascriptExtension}`)
      ) {
        return true;
      }
    }
  }

  const isDirectory = fs.existsSync(candidate) && fs.statSync(candidate).isDirectory();
  if (isDirectory) {
    for (const sourceExtension of sourceExtensions) {
      if (
        fs.existsSync(path.join(candidate, `index${sourceExtension}`)) &&
        fs.existsSync(path.join(candidate, 'index.js'))
      ) {
        return true;
      }
    }
  }

  return false;
}

module.exports = (request, options) => {
  // Explicit extensions express the importer's choice. Keep Jest's normal
  // resolution for them, including legitimate imports of a .js runtime file.
  if (path.extname(request) !== '' || !(request.startsWith('.') || path.isAbsolute(request))) {
    return options.defaultResolver(request, options);
  }

  const candidate = path.resolve(options.basedir, request);
  if (!isWithin(coreSourceRoot, candidate) || !hasGeneratedJavaScriptSibling(candidate)) {
    return options.defaultResolver(request, options);
  }

  const extensions = options.extensions ?? [];
  const typescriptExtensions = extensions.filter((extension) =>
    extension === '.ts' || extension === '.tsx',
  );
  const remainingExtensions = extensions.filter((extension) =>
    extension !== '.ts' && extension !== '.tsx',
  );

  return options.defaultResolver(request, {
    ...options,
    extensions: [...typescriptExtensions, ...remainingExtensions],
  });
};
