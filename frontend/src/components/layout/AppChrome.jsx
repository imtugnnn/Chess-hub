import { AppSidebar } from "./AppSidebar";
import { AppHeadbar } from "./AppHeadbar";

// All authenticated workspaces share one navigation and account surface.
// Pages retain their own content headings, filters, actions and loading states.
export function AppChrome({ title, ...navigation }) {
  return <>
    <AppSidebar {...navigation} variant="reference" />
    <AppHeadbar title={title} teacherName={navigation.teacherName} onNavigate={navigation.onNavigate} onLogout={navigation.onLogout} />
  </>;
}
