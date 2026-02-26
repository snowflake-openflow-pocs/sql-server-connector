import SetupForm from './SetupForm';

export default function SetupPage() {
  const defaultHost = process.env.SQL_HOST || '';
  const defaultPort = process.env.SQL_PORT || '1433';
  const defaultUser = process.env.SQL_USER || 'sa';
  const defaultPassword = process.env.SQL_PASSWORD || '';

  return (
    <SetupForm
      defaultHost={defaultHost}
      defaultPort={defaultPort}
      defaultUser={defaultUser}
      defaultPassword={defaultPassword}
    />
  );
}
