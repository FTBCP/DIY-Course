import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import LoadingScreen from './pages/LoadingScreen'
import AuthWrapper from './components/AuthWrapper'
import CoursePlayer from './pages/CoursePlayer'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route 
          path="/course/:id" 
          element={
            <AuthWrapper>
              <CoursePlayer />
            </AuthWrapper>
          } 
        />
        <Route
          path="/"
          element={
            <AuthWrapper>
              <Dashboard />
            </AuthWrapper>
          }
        />
        <Route 
          path="/generating" 
          element={
            <AuthWrapper>
              <LoadingScreen />
            </AuthWrapper>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
