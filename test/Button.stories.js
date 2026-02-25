export default {
  title: 'Example/Button'
};

export const Primary = {
  render: () => <button style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer' }}>Click me</button>
};

export const Secondary = {
  render: () => <button style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', background: '#eee' }}>Secondary</button>
};
