function parseMarkdownStructure(markdown) {
  const cleaned = markdown
    .replace(/^```[a-z]*\n?/, "")
    .replace(/```$/, "")
    .trim();

  const lines = cleaned.split("\n").filter(line => line.trim() !== "");

  const paths = [];
  const stack = [];

  for (let i = 0; i < lines.length; i++) {
    let rawLine = lines[i];

    // Clean tree drawing characters (│├└─)
    let line = rawLine.replace(/[│├└─]/g, "").trimStart();

    const spaces = rawLine.search(/\S|$/);
    const depth = Math.floor(spaces / 4);

    const name = line.trim();

    // Adjust stack based on depth
    stack.length = depth; 
    stack[depth] = name; 

    const fullPath = stack.join("/");

    paths.push(fullPath);
  }

  return paths;
}





  module.exports = {
    parseMarkdownStructure,
  };