import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './CompanyPage.css';

interface Company {
  id: number;
  name: string;
  description: string;
  website?: string;
  location?: string;
  industry?: string;
  size?: string;
  founded_year?: number;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

interface CompanyFormData {
  name: string;
  description: string;
  website: string;
  location: string;
  industry: string;
  size: string;
  founded_year: string;
  logo_url: string;
}

const CompanyPage: React.FC = () => {
  const { user, token } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    description: '',
    website: '',
    location: '',
    industry: '',
    size: '',
    founded_year: '',
    logo_url: ''
  });

  useEffect(() => {
    if (user && user.role === 'employer') {
      fetchCompany();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchCompany = async () => {
    try {
      const response = await axios.get('http://localhost:8000/companies/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setCompany(response.data);
      setFormData({
        name: response.data.name || '',
        description: response.data.description || '',
        website: response.data.website || '',
        location: response.data.location || '',
        industry: response.data.industry || '',
        size: response.data.size || '',
        founded_year: response.data.founded_year?.toString() || '',
        logo_url: response.data.logo_url || ''
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Компания не найдена, пользователь может создать новую
        setCompany(null);
      } else {
        setError('Ошибка при загрузке информации о компании');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const submitData = {
        ...formData,
        founded_year: formData.founded_year ? parseInt(formData.founded_year) : undefined
      };

      let response;
      if (company) {
        // Обновление существующей компании
        response = await axios.put('http://localhost:8000/companies/me', submitData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setSuccess('Информация о компании успешно обновлена');
      } else {
        // Создание новой компании
        response = await axios.post('http://localhost:8000/companies/', submitData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setSuccess('Компания успешно создана');
      }

      setCompany(response.data);
      setIsEditing(false);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Ошибка при сохранении информации о компании');
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    if (company) {
      setFormData({
        name: company.name || '',
        description: company.description || '',
        website: company.website || '',
        location: company.location || '',
        industry: company.industry || '',
        size: company.size || '',
        founded_year: company.founded_year?.toString() || '',
        logo_url: company.logo_url || ''
      });
    }
  };

  if (loading) {
    return (
      <div className="company-page">
        <div className="container">
          <div className="loading">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'employer') {
    return (
      <div className="company-page">
        <div className="container">
          <div className="error-message">
            Доступ запрещен. Эта страница доступна только для работодателей.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="company-page">
      <div className="container">
        <div className="company-content">
          <div className="company-header">
            <h1>{company ? 'Моя компания' : 'Создать компанию'}</h1>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="company-card">
            {!isEditing && company ? (
              // Режим просмотра
              <div className="company-info">
                <div className="card-header">
                  <h2>Информация о компании</h2>
                  <button onClick={handleEdit} className="btn btn-primary">
                    Редактировать
                  </button>
                </div>

                <div className="company-details">
                  {company.logo_url && (
                    <div className="company-logo">
                      <img src={company.logo_url} alt={company.name} />
                    </div>
                  )}
                  
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Название:</span>
                      <span className="info-value">{company.name}</span>
                    </div>
                    
                    <div className="info-item">
                      <span className="info-label">Описание:</span>
                      <span className="info-value">{company.description}</span>
                    </div>
                    
                    {company.website && (
                      <div className="info-item">
                        <span className="info-label">Веб-сайт:</span>
                        <span className="info-value">
                          <a href={company.website} target="_blank" rel="noopener noreferrer">
                            {company.website}
                          </a>
                        </span>
                      </div>
                    )}
                    
                    {company.location && (
                      <div className="info-item">
                        <span className="info-label">Местоположение:</span>
                        <span className="info-value">{company.location}</span>
                      </div>
                    )}
                    
                    {company.industry && (
                      <div className="info-item">
                        <span className="info-label">Отрасль:</span>
                        <span className="info-value">{company.industry}</span>
                      </div>
                    )}
                    
                    {company.size && (
                      <div className="info-item">
                        <span className="info-label">Размер компании:</span>
                        <span className="info-value">{company.size}</span>
                      </div>
                    )}
                    
                    {company.founded_year && (
                      <div className="info-item">
                        <span className="info-label">Год основания:</span>
                        <span className="info-value">{company.founded_year}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Режим редактирования/создания
              <div className="company-form-container">
                <div className="card-header">
                  <h2>{company ? 'Редактировать компанию' : 'Создать компанию'}</h2>
                </div>

                <form onSubmit={handleSubmit} className="company-form">
                  <div className="form-group">
                    <label htmlFor="name">Название компании *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="description">Описание *</label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="website">Веб-сайт</label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="location">Местоположение</label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Город, Страна"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="industry">Отрасль</label>
                    <select
                      id="industry"
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                    >
                      <option value="">Выберите отрасль</option>
                      <option value="Информационные технологии">Информационные технологии</option>
                      <option value="Финансы">Финансы</option>
                      <option value="Здравоохранение">Здравоохранение</option>
                      <option value="Образование">Образование</option>
                      <option value="Производство">Производство</option>
                      <option value="Розничная торговля">Розничная торговля</option>
                      <option value="Консалтинг">Консалтинг</option>
                      <option value="Маркетинг и реклама">Маркетинг и реклама</option>
                      <option value="Строительство">Строительство</option>
                      <option value="Другое">Другое</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="size">Размер компании</label>
                    <select
                      id="size"
                      name="size"
                      value={formData.size}
                      onChange={handleInputChange}
                    >
                      <option value="">Выберите размер</option>
                      <option value="1-10">1-10 сотрудников</option>
                      <option value="11-50">11-50 сотрудников</option>
                      <option value="51-200">51-200 сотрудников</option>
                      <option value="201-500">201-500 сотрудников</option>
                      <option value="501-1000">501-1000 сотрудников</option>
                      <option value="1000+">1000+ сотрудников</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="founded_year">Год основания</label>
                    <input
                      type="number"
                      id="founded_year"
                      name="founded_year"
                      value={formData.founded_year}
                      onChange={handleInputChange}
                      min="1800"
                      max={new Date().getFullYear()}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="logo_url">URL логотипа</label>
                    <input
                      type="url"
                      id="logo_url"
                      name="logo_url"
                      value={formData.logo_url}
                      onChange={handleInputChange}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      {company ? 'Сохранить изменения' : 'Создать компанию'}
                    </button>
                    {company && (
                      <button type="button" onClick={handleCancel} className="btn btn-secondary">
                        Отмена
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyPage;