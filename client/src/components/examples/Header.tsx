import Header from '../Header';

export default function HeaderExample() {
  return <Header onToggleTheme={() => console.log('Theme toggle clicked')} isDark={false} />;
}