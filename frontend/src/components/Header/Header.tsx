import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Header.css'

const Header: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setIsMenuOpen(false)
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-text">MyLink.kz</span>
          </Link>

          <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
            <Link to="/jobs" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Вакансии
            </Link>
            
            {user ? (
              <>
                {user.role === 'job_seeker' && (
                  <Link to="/resume" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                    Мое резюме
                  </Link>
                )}
                {user.role === 'employer' && (
                  <Link to="/company" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                    Моя компания
                  </Link>
                )}
                <Link to="/profile" className="nav-link" onClick={() => setIsMenuOpen(false)}>
                  Профиль
                </Link>
                <button className="nav-link logout-btn" onClick={handleLogout}>
                  Выйти
                </button>
              </>
            ) : (
              <div className="auth-buttons">
                <Link to="/login" className="btn btn-outline" onClick={() => setIsMenuOpen(false)}>
                  Войти
                </Link>
                <Link to="/register" className="btn btn-primary" onClick={() => setIsMenuOpen(false)}>
                  Регистрация
                </Link>
              </div>
            )}
          </nav>

          <button className="mobile-menu-btn" onClick={toggleMenu}>
            <span className={`hamburger ${isMenuOpen ? 'hamburger-open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header