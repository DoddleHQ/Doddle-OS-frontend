module.exports = {
  __esModule: true,
  default: function ReactMarkdownMock(props) {
    return String(props.children ?? '').replace(/\*\*/g, '');
  },
};
