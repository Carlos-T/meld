const fs = require('fs');
const Marked = require('marked');
const Path = require('path');

const IMPORT_REG_EX = /<!--- import (([a-zA-Z]*[\/\\])*[a-zA-Z]*\.[a-zA-Z]*) --->/g;
const JS_IMPORT_REG_EX = /<!--- import (([a-zA-Z]*[\/\\])*[a-zA-Z]*\.js) --->/g;
const HTML_IMPORT_REG_EX = /<!--- import iframe (([a-zA-Z]*[\/\\])*[a-zA-Z]*\.html) --->/g;

const TEMP_PATH = 'temp/';
const startDir = 'things/'

fromDir(startDir, /\.md$/, function(filename) {
  console.log('File: ', filename);
  gather(Path.dirname(filename), Path.basename(filename));
});

function transform(name, destPath, markdownString) {
  Marked.setOptions({
    highlight: function(code) {
      return '</code></pre>' + code + '<pre><code>';
      // return require('highlight.js').highlightAuto(code).value;
    }
  });

  let doc = Marked(markdownString);
  doc = doc.replace(JS_IMPORT_REG_EX, '<script src="$1"></script>');
  doc = doc.replace(HTML_IMPORT_REG_EX, '<iframe src="$1"></iframe>');
  
  fs.writeFileSync(Path.join(destPath, name + '.html'),  doc);
}

function gather(path, fileName) {
  mkDirRec(Path.join(TEMP_PATH, path));
  const markdownString = fs.readFileSync(Path.join(path, fileName), "utf8");
  Path.extname
  transform(Path.parse(fileName).name, Path.join(TEMP_PATH, path), markdownString);
  
  const imports = markdownString.match(IMPORT_REG_EX)
  if (imports) {
    for (const i of imports) {
      const file = i.replace(IMPORT_REG_EX, '$1');
      let filePath = Path.dirname(file);
      mkDirRec(Path.join(TEMP_PATH, path, filePath));
      try {
        fs.copyFileSync(Path.join(path, file), Path.join(TEMP_PATH, path, file));
      } catch (error) {
        console.error('Error copying', error);
      }
    }
  }
}

function mkDirRec(recPath) {
  recPath = recPath.split(Path.sep);
  recPath.reduce((parentDir, childDir) => {
    const curDir = Path.join(parentDir, childDir);
    try {
      fs.mkdirSync(curDir);
      return curDir;
    } catch (err) {
      if (err.code === 'EEXIST') {
        return curDir;
      } else {
        console.error('Unexpected error: ', err);
      }
    }
  }, '');
}

function fromDir(startPath, filter, callback) {
  if (!fs.existsSync(startPath)){
    console.error('No dir ', startPath);
    return;
  }

  var files = fs.readdirSync(startPath);
  for (var i = 0; i < files.length; i++) {
    var filename = Path.join(startPath, files[i]);
    var stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      fromDir(filename, filter, callback);
    } else if (filter.test(filename)) {
      callback(filename);
    }
  };
}