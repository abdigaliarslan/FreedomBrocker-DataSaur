import React from 'react'
import './Footer.css'

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">MyLink.kz</h3>
            <p className="footer-description">
              Ведущий портал поиска работы и подбора персонала в Казахстане
            </p>
          </div>
          
          <div className="footer-section">
            <h4 className="footer-subtitle">Соискателям</h4>
            <ul className="footer-links">
              <li><a href="/jobs">Поиск вакансий</a></li>
              <li><a href="/resume">Создать резюме</a></li>
              <li><a href="/profile">Личный кабинет</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4 className="footer-subtitle">Работодателям</h4>
            <ul className="footer-links">
              <li><a href="/company">Разместить вакансию</a></li>
              <li><a href="/company">Управление компанией</a></li>
              <li><a href="/register">Регистрация работодателя</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4 className="footer-subtitle">Контакты</h4>
            <ul className="footer-links">
              <li>Email: info@mylink.kz</li>
              <li>Телефон: +7 (727) 123-45-67</li>
              <li>Адрес: г. Алматы, ул. Абая, 123</li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 MyLink.kz. Все права защищены.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer