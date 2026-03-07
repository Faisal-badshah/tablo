import { Navigate } from 'react-router-dom';

// Redirect old / route to landing page (handled by LandingPage now)
const Index = () => <Navigate to="/" replace />;

export default Index;
