/** react-markdown test stand-in — renders children as plain text (ESM-safe). */
module.exports = {
  __esModule: true,
  default: function ReactMarkdownMock(props) {
    return String(props.children ?? '').replace(/\*\*/g, '');
  },
};
