import { useState, useCallback } from 'react'
import { importTickets, importManagers, importBusinessUnits } from '@/api/import'
import type { ImportResult } from '@/types/common'
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/ui/PageHeader'

type ImportType = 'tickets' | 'managers' | 'business-units'

const TYPES: { key: ImportType; label: string }[] = [
  { key: 'tickets', label: 'Tickets' },
  { key: 'managers', label: 'Managers' },
  { key: 'business-units', label: 'Business Units' },
]

export default function ImportPage() {
  const [selectedType, setSelectedType] = useState<ImportType>('tickets')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    setLoading(true)
    setResult(null)
    setError('')

    try {
      let res: ImportResult
      switch (selectedType) {
        case 'tickets': res = await importTickets(file); break
        case 'managers': res = await importManagers(file); break
        case 'business-units': res = await importBusinessUnits(file); break
      }
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }, [selectedType])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="max-w-2xl fb-animate-in">
      <PageHeader title="Import CSV Data" subtitle="Upload your data files to populate the system" />

      {/* Type selector */}
      <div className="flex gap-2 mb-6">
        {TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSelectedType(key)}
            className={cn('px-4 py-2 rounded-full text-sm font-semibold transition-all border')}
            style={selectedType === key
              ? { background: 'linear-gradient(135deg, var(--fb-green), var(--fb-green-light))', color: '#fff', border: '1px solid transparent', boxShadow: '0 4px 15px rgba(0,179,35,0.25)' }
              : { background: '#fff', color: 'var(--fb-text-secondary)', border: '1px solid var(--fb-border)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        className="fb-card rounded-2xl p-14 text-center cursor-pointer transition-all"
        style={{
          border: `2px dashed ${dragActive ? 'var(--fb-green)' : 'var(--fb-border)'}`,
          background: dragActive ? 'var(--fb-green-50)' : '#fff',
          boxShadow: dragActive ? '0 0 30px var(--fb-green-glow)' : undefined,
        }}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onClick={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.csv'
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) handleFile(file)
          }
          input.click()
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: dragActive ? 'linear-gradient(135deg, var(--fb-green), var(--fb-green-light))' : 'var(--fb-green-50)',
            animation: dragActive ? 'fb-float 2s ease-in-out infinite' : undefined,
          }}
        >
          <Upload className="w-7 h-7" style={{ color: dragActive ? '#fff' : 'var(--fb-green)' }} />
        </div>

        {loading ? (
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--fb-green)' }}>Uploading...</p>
            <div className="w-48 h-1.5 rounded-full mx-auto overflow-hidden" style={{ background: 'var(--fb-green-100)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, var(--fb-green), var(--fb-green-light))',
                  animation: 'fb-shimmer 1s ease infinite',
                  backgroundSize: '200% 100%',
                  width: '100%',
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fb-text)' }}>
              Drop CSV file here or click to select
            </p>
            <p className="text-xs" style={{ color: 'var(--fb-text-secondary)' }}>
              Supports .csv files
            </p>
          </>
        )}
      </div>

      {/* CSV Format hint */}
      <div className="fb-card p-4 mt-4 fb-animate-in fb-animate-delay-1">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4" style={{ color: 'var(--fb-green)' }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--fb-text)' }}>Expected CSV format for {selectedType}</p>
        </div>
        <pre className="text-xs p-2 rounded-lg font-mono overflow-x-auto" style={{ background: 'var(--fb-bg-subtle)', color: 'var(--fb-text-secondary)' }}>
          {selectedType === 'tickets' && 'external_id,subject,body,client_name,client_segment,source_channel,raw_address'}
          {selectedType === 'managers' && 'full_name,email,business_unit_id,is_vip_skill,is_chief_spec,languages,max_load'}
          {selectedType === 'business-units' && 'name,city,address,lat,lon'}
        </pre>
      </div>

      {/* Result */}
      {result && (
        <div className="mt-5 fb-card p-5 fb-animate-in" style={{ borderLeft: '3px solid var(--fb-green)', boxShadow: '0 4px 20px var(--fb-green-glow)' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5" style={{ color: 'var(--fb-green)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--fb-text)' }}>Import Complete</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg" style={{ background: 'var(--fb-green-50)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--fb-text-secondary)' }}>Imported</p>
              <p className="text-xl font-bold" style={{ color: 'var(--fb-green)' }}>{result.imported}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--fb-bg-subtle)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--fb-text-secondary)' }}>Skipped</p>
              <p className="text-xl font-bold" style={{ color: 'var(--fb-text)' }}>{result.skipped}</p>
            </div>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs font-semibold text-red-700 mb-1">Errors:</p>
              <ul className="text-xs list-disc list-inside text-red-600 space-y-0.5">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
