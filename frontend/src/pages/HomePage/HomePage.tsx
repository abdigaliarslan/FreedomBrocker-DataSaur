import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './HomePage.css'

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery) params.append('q', searchQuery)
    if (location) params.append('location', location)
    navigate(`/jobs?${params.toString()}`)
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Найдите работу своей мечты в Казахстане
            </h1>
            <p className="hero-subtitle">
              Более 10,000 актуальных вакансий от ведущих компаний страны
            </p>
            
            <form className="search-form" onSubmit={handleSearch}>
              <div className="search-inputs">
                <input
                  type="text"
                  placeholder="Должность, ключевые слова"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <input
                  type="text"
                  placeholder="Город"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="btn btn-primary search-btn">
                  Найти работу
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Почему выбирают MyLink.kz?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💼</div>
              <h3>Тысячи вакансий</h3>
              <p>Более 10,000 актуальных предложений от проверенных работодателей</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Точный поиск</h3>
              <p>Умные фильтры помогут найти идеальную работу по вашим критериям</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Мобильное приложение</h3>
              <p>Ищите работу в любое время и в любом месте с нашим приложением</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Быстрые отклики</h3>
              <p>Получайте ответы от работодателей в течение 24 часов</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            {!user ? (
              <>
                <h2>Готовы начать поиск работы?</h2>
                <p>Создайте аккаунт и получите доступ ко всем возможностям платформы</p>
                <div className="cta-buttons">
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/register')}
                  >
                    Зарегистрироваться
                  </button>
                  <button 
                    className="btn btn-outline"
                    onClick={() => navigate('/jobs')}
                  >
                    Смотреть вакансии
                  </button>
                </div>
              </>
            ) : user.role === 'job_seeker' ? (
              <>
                <h2>Добро пожаловать, {user.full_name}!</h2>
                <p>Создайте резюме и начните получать предложения от работодателей</p>
                <div className="cta-buttons">
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/resume')}
                  >
                    Создать резюме
                  </button>
                  <button 
                    className="btn btn-outline"
                    onClick={() => navigate('/jobs')}
                  >
                    Найти работу
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Добро пожаловать, {user.full_name}!</h2>
                <p>Разместите вакансии и найдите лучших кандидатов для вашей компании</p>
                <div className="cta-buttons">
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/company')}
                  >
                    Разместить вакансию
                  </button>
                  <button 
                    className="btn btn-outline"
                    onClick={() => navigate('/company')}
                  >
                    Управление компанией
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage