import React, { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { useUiStore } from './stores/uiStore';
import { LoginPage } from './components/auth/LoginPage';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ChatPage } from './components/chat/ChatPage';
import { ContactsPage } from './components/contacts/ContactsPage';
import { GroupsPage } from './components/groups/GroupsPage';
import { TemplatesPage } from './components/templates/TemplatesPage';
import { CatalogsPage } from './components/catalogs/CatalogsPage';
import { SendPage } from './components/send/SendPage';
import { AdvisorsPage } from './components/advisors/AdvisorsPage';
import { StatsPage } from './components/stats/StatsPage';
import { AISettingsPage } from './components/ai/AISettingsPage';
import { ConfigPage } from './components/config/ConfigPage';

const App: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const token = useAuthStore((s) => s.token);
  const activeSection = useUiStore((s) => s.activeSection);

  useEffect(() => {
    if (token) {
      fetchMe();
    }
  }, [token, fetchMe]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardPage />;
      case 'chats':
        return <ChatPage />;
      case 'contacts':
        return <ContactsPage />;
      case 'groups':
        return <GroupsPage />;
      case 'templates':
        return <TemplatesPage />;
      case 'catalogs':
        return <CatalogsPage />;
      case 'messaging':
        return <SendPage />;
      case 'users':
        return <AdvisorsPage />;
      case 'stats':
        return <StatsPage />;
      case 'ai-settings':
        return <AISettingsPage />;
      case 'connection':
        return <ConfigPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <MainLayout>
      {renderSection()}
    </MainLayout>
  );
};

export default App;
