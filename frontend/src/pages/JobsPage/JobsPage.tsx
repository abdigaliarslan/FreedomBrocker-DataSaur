import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'
import './JobsPage.css'

interface Job {
  id: number
  title: string
  description: string
  location: string
  employment_type: string
  experience_level: string
  salary_min?: number
  salary_max?: number
  is_remote: boolean
  views: number
  created_at: string
  company: {
    id: number
    name: string
    description?: string
  }
}

interface JobSearchResponse {
  jobs: Job[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

const JobsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    location: searchParams.get('location') || '',
    employment_type: searchParams.get('employment_type') || '',
    experience_level: searchParams.get('experience_level') || '',
    is_remote: searchParams.get('is_remote') === 'true',
    salary_min: searchParams.get('salary_min') || '',
    salary_max: searchParams.get('salary_max') || ''
  })

  const API_BASE_URL = 'http://localhost:8000'

  useEffect(() => {
    fetchJobs()
  }, [searchParams])

  const fetchJobs = async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          params.append(key, value.toString())
        }
      })
      params.append('page', currentPage.toString())

      const response = await axios.get<JobSearchResponse>(`${API_BASE_URL}/jobs/search?${params}`)
      setJobs(response.data.jobs)
      setTotalPages(response.data.total_pages)
    } catch (error) {
      setError('Ошибка при загрузке вакансий')
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v && v !== '') {
        params.append(k, v.toString())
      }
    })
    setSearchParams(params)
    setCurrentPage(1)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchJobs()
  }

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Зарплата не указана'
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} ₸`
    if (min) return `от ${min.toLocaleString()} ₸`
    if (max) return `до ${max.toLocaleString()} ₸`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  return (
    <div className="jobs-page">
      <div className="container">
        <div className="jobs-header">
          <h1>Поиск вакансий</h1>
          <p className="text-muted">Найдите работу своей мечты среди тысяч предложений</p>
        </div>

        {/* Фильтры поиска */}
        <div className="search-filters">
          <form onSubmit={handleSearch} className="filters-form">
            <div className="filters-row">
              <input
                type="text"
                placeholder="Должность, ключевые слова"
                value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
                className="form-input"
              />
              <input
                type="text"
                placeholder="Город"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="form-input"
              />
              <button type="submit" className="btn btn-primary">
                Найти
              </button>
            </div>
            
            <div className="filters-row">
              <select
                value={filters.employment_type}
                onChange={(e) => handleFilterChange('employment_type', e.target.value)}
                className="form-input"
              >
                <option value="">Тип занятости</option>
                <option value="full_time">Полная занятость</option>
                <option value="part_time">Частичная занятость</option>
                <option value="contract">Контракт</option>
                <option value="internship">Стажировка</option>
              </select>
              
              <select
                value={filters.experience_level}
                onChange={(e) => handleFilterChange('experience_level', e.target.value)}
                className="form-input"
              >
                <option value="">Опыт работы</option>
                <option value="no_experience">Без опыта</option>
                <option value="1_3_years">1-3 года</option>
                <option value="3_6_years">3-6 лет</option>
                <option value="6_plus_years">6+ лет</option>
              </select>
              
              <div className="salary-inputs">
                <input
                  type="number"
                  placeholder="Зарплата от"
                  value={filters.salary_min}
                  onChange={(e) => handleFilterChange('salary_min', e.target.value)}
                  className="form-input"
                />
                <input
                  type="number"
                  placeholder="Зарплата до"
                  value={filters.salary_max}
                  onChange={(e) => handleFilterChange('salary_max', e.target.value)}
                  className="form-input"
                />
              </div>
              
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.is_remote}
                  onChange={(e) => handleFilterChange('is_remote', e.target.checked)}
                />
                Удаленная работа
              </label>
            </div>
          </form>
        </div>

        {/* Результаты поиска */}
        <div className="jobs-content">
          {loading ? (
            <div className="loading">Загрузка вакансий...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : jobs.length === 0 ? (
            <div className="no-results">
              <h3>Вакансии не найдены</h3>
              <p>Попробуйте изменить параметры поиска</p>
            </div>
          ) : (
            <>
              <div className="jobs-list">
                {jobs.map((job) => (
                  <div key={job.id} className="job-card">
                    <div className="job-header">
                      <h3 className="job-title">
                        <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                      </h3>
                      <div className="job-company">{job.company.name}</div>
                    </div>
                    
                    <div className="job-details">
                      <div className="job-location">📍 {job.location}</div>
                      <div className="job-salary">{formatSalary(job.salary_min, job.salary_max)}</div>
                      {job.is_remote && <div className="job-remote">🏠 Удаленно</div>}
                    </div>
                    
                    <div className="job-description">
                      {job.description.length > 200 
                        ? `${job.description.substring(0, 200)}...` 
                        : job.description
                      }
                    </div>
                    
                    <div className="job-footer">
                      <div className="job-meta">
                        <span>👁 {job.views} просмотров</span>
                        <span>📅 {formatDate(job.created_at)}</span>
                      </div>
                      <Link to={`/jobs/${job.id}`} className="btn btn-outline">
                        Подробнее
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="pagination">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentPage(page)
                        const params = new URLSearchParams(searchParams)
                        params.set('page', page.toString())
                        setSearchParams(params)
                      }}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default JobsPage