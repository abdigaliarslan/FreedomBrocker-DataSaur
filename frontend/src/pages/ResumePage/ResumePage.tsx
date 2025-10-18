import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import './ResumePage.css';

interface Resume {
  id: number;
  title: string;
  summary: string;
  experience: string;
  education: string;
  skills: string;
  contact_info: string;
  created_at: string;
  updated_at: string;
}

interface ResumeFormData {
  title: string;
  summary: string;
  experience: string;
  education: string;
  skills: string;
  contact_info: string;
}

interface JobApplication {
  id: number;
  job_id: number;
  resume_id: number;
  cover_letter?: string;
  status: string;
  applied_at: string;
  job: {
    id: number;
    title: string;
    company: {
      name: string;
    };
  };
}

const ResumePage: React.FC = () => {
  const { user, token } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'resumes' | 'applications'>('resumes');
  const [formData, setFormData] = useState<ResumeFormData>({
    title: '',
    summary: '',
    experience: '',
    education: '',
    skills: '',
    contact_info: ''
  });

  useEffect(() => {
    if (user && user.role === 'job_seeker') {
      fetchResumes();
      fetchApplications();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchResumes = async () => {
    try {
      const response = await axios.get('http://localhost:8000/resumes/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setResumes(response.data);
    } catch (error: any) {
      setError('Ошибка при загрузке резюме');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await axios.get('http://localhost:8000/resumes/applications/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setApplications(response.data);
    } catch (error: any) {
      console.error('Ошибка при загрузке заявок:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      let response: any;
      if (isCreating) {
        // Создание нового резюме
        response = await axios.post('http://localhost:8000/resumes/', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setSuccess('Резюме успешно создано');
        setResumes(prev => [...prev, response.data]);
      } else if (selectedResume) {
        // Обновление существующего резюме
        response = await axios.put(`http://localhost:8000/resumes/${selectedResume.id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setSuccess('Резюме успешно обновлено');
        setResumes(prev => prev.map(r => r.id === selectedResume.id ? response.data : r));
        setSelectedResume(response.data);
      }

      setIsEditing(false);
      setIsCreating(false);
      resetForm();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Ошибка при сохранении резюме');
    }
  };

  const handleEdit = (resume: Resume) => {
    setSelectedResume(resume);
    setFormData({
      title: resume.title,
      summary: resume.summary,
      experience: resume.experience,
      education: resume.education,
      skills: resume.skills,
      contact_info: resume.contact_info
    });
    setIsEditing(true);
    setIsCreating(false);
    setError('');
    setSuccess('');
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedResume(null);
    resetForm();
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    setSelectedResume(null);
    resetForm();
    setError('');
    setSuccess('');
  };

  const handleDelete = async (resumeId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить это резюме?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8000/resumes/${resumeId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setResumes(prev => prev.filter(r => r.id !== resumeId));
      setSuccess('Резюме успешно удалено');
      if (selectedResume?.id === resumeId) {
        setSelectedResume(null);
      }
    } catch (error: any) {
      setError('Ошибка при удалении резюме');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      summary: '',
      experience: '',
      education: '',
      skills: '',
      contact_info: ''
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'reviewed':
        return 'status-reviewed';
      case 'accepted':
        return 'status-accepted';
      case 'rejected':
        return 'status-rejected';
      default:
        return 'status-pending';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'На рассмотрении';
      case 'reviewed':
        return 'Просмотрено';
      case 'accepted':
        return 'Принято';
      case 'rejected':
        return 'Отклонено';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="resume-page">
        <div className="container">
          <div className="loading">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'job_seeker') {
    return (
      <div className="resume-page">
        <div className="container">
          <div className="error-message">
            Доступ запрещен. Эта страница доступна только для соискателей.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="resume-page">
      <div className="container">
        <div className="resume-content">
          <div className="resume-header">
            <h1>Мои резюме и заявки</h1>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'resumes' ? 'active' : ''}`}
              onClick={() => setActiveTab('resumes')}
            >
              Резюме ({resumes.length})
            </button>
            <button
              className={`tab ${activeTab === 'applications' ? 'active' : ''}`}
              onClick={() => setActiveTab('applications')}
            >
              Заявки ({applications.length})
            </button>
          </div>

          {activeTab === 'resumes' && (
            <div className="resumes-section">
              {!isEditing && !isCreating && (
                <div className="section-header">
                  <button onClick={handleCreate} className="btn btn-primary">
                    Создать резюме
                  </button>
                </div>
              )}

              {isCreating || isEditing ? (
                <div className="resume-card">
                  <div className="card-header">
                    <h2>{isCreating ? 'Создать резюме' : 'Редактировать резюме'}</h2>
                  </div>

                  <form onSubmit={handleSubmit} className="resume-form">
                    <div className="form-group">
                      <label htmlFor="title">Название резюме *</label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        placeholder="Например: Frontend разработчик"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="summary">Краткое описание *</label>
                      <textarea
                        id="summary"
                        name="summary"
                        value={formData.summary}
                        onChange={handleInputChange}
                        rows={3}
                        required
                        placeholder="Краткое описание ваших навыков и опыта"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="experience">Опыт работы *</label>
                      <textarea
                        id="experience"
                        name="experience"
                        value={formData.experience}
                        onChange={handleInputChange}
                        rows={5}
                        required
                        placeholder="Опишите ваш опыт работы, должности, компании и достижения"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="education">Образование *</label>
                      <textarea
                        id="education"
                        name="education"
                        value={formData.education}
                        onChange={handleInputChange}
                        rows={3}
                        required
                        placeholder="Укажите ваше образование, учебные заведения, специальности"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="skills">Навыки *</label>
                      <textarea
                        id="skills"
                        name="skills"
                        value={formData.skills}
                        onChange={handleInputChange}
                        rows={3}
                        required
                        placeholder="Перечислите ваши профессиональные навыки"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="contact_info">Контактная информация *</label>
                      <textarea
                        id="contact_info"
                        name="contact_info"
                        value={formData.contact_info}
                        onChange={handleInputChange}
                        rows={2}
                        required
                        placeholder="Телефон, email, LinkedIn и другие контакты"
                      />
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        {isCreating ? 'Создать резюме' : 'Сохранить изменения'}
                      </button>
                      <button type="button" onClick={handleCancel} className="btn btn-secondary">
                        Отмена
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="resumes-list">
                  {resumes.length === 0 ? (
                    <div className="empty-state">
                      <p>У вас пока нет резюме</p>
                      <button onClick={handleCreate} className="btn btn-primary">
                        Создать первое резюме
                      </button>
                    </div>
                  ) : (
                    resumes.map(resume => (
                      <div key={resume.id} className="resume-card">
                        <div className="card-header">
                          <h3>{resume.title}</h3>
                          <div className="card-actions">
                            <button
                              onClick={() => handleEdit(resume)}
                              className="btn btn-secondary btn-sm"
                            >
                              Редактировать
                            </button>
                            <button
                              onClick={() => handleDelete(resume.id)}
                              className="btn btn-danger btn-sm"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                        
                        <div className="resume-preview">
                          <p><strong>Краткое описание:</strong> {resume.summary}</p>
                          <p><strong>Создано:</strong> {formatDate(resume.created_at)}</p>
                          <p><strong>Обновлено:</strong> {formatDate(resume.updated_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="applications-section">
              {applications.length === 0 ? (
                <div className="empty-state">
                  <p>У вас пока нет заявок на вакансии</p>
                  <p>Найдите интересные вакансии и подайте заявку!</p>
                </div>
              ) : (
                <div className="applications-list">
                  {applications.map(application => (
                    <div key={application.id} className="application-card">
                      <div className="application-header">
                        <h3>{application.job.title}</h3>
                        <span className={`status ${getStatusColor(application.status)}`}>
                          {getStatusText(application.status)}
                        </span>
                      </div>
                      
                      <div className="application-details">
                        <p><strong>Компания:</strong> {application.job.company.name}</p>
                        <p><strong>Дата подачи:</strong> {formatDate(application.applied_at)}</p>
                        {application.cover_letter && (
                          <p><strong>Сопроводительное письмо:</strong> {application.cover_letter}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumePage;