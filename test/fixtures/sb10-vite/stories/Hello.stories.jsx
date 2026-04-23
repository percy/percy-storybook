const Hello = ({ name = 'World' }) => <div>Hello, {name}!</div>;

export default {
  title: 'Smoke/Hello',
  component: Hello
};

export const Default = { args: { name: 'Percy' } };
