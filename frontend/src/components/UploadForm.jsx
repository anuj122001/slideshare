import { useState, useEffect } from 'react';
import api from '../services/api';

const ACCEPT = '.pdf,.ppt,.pptx,.doc,.docx';

const CONTENT_TYPE_MAP = {
  pdf:  'application/pdf',
  ppt:  'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc:  'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export default function UploadForm({ classes, onSuccess }) {
  const [form, setForm] = useState({ title: '', classId: '', fileType: 'PDF' });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (classes.length && !form.classId) {
      setForm((f) => ({ ...f, classId: classes[0].id }));
    }
  }, [classes]);

  function handleField(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return setError('Please select a file.');
    if (!form.title.trim()) return setError('Title is required.');
    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const contentType = CONTENT_TYPE_MAP[ext] || 'application/octet-stream';

      // Step 1: get presigned URL
      const { data: { presignedUrl, s3Key } } = await api.post('/documents/presigned-url', {
        filename:    file.name,
        fileType:    form.fileType,
        classId:     form.classId,
        contentType,
      });

      // Step 2: upload directly to S3 via XHR so we can track progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error('S3 upload failed'));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', contentType);
        xhr.send(file);
      });

      // Step 3: save metadata
      await api.post('/documents/save-metadata', {
        title:    form.title.trim(),
        s3Key,
        fileType: form.fileType,
        classId:  form.classId,
      });

      setForm((f) => ({ ...f, title: '' }));
      setFile(null);
      setProgress(0);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div>
        <label className="label">Document Title</label>
        <input
          name="title"
          value={form.title}
          onChange={handleField}
          placeholder="e.g. Calculus Chapter 1 Notes"
          className="input"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Class</label>
          <select name="classId" value={form.classId} onChange={handleField} className="input">
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">File Type</label>
          <select name="fileType" value={form.fileType} onChange={handleField} className="input">
            <option value="PDF">PDF</option>
            <option value="PPT">PPT</option>
            <option value="NOTES">Notes</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">File</label>
        <input
          type="file"
          accept={ACCEPT}
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
        />
        {file && (
          <p className="text-xs text-gray-400 mt-1">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
        )}
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Uploading…</span><span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-brand-600 h-1.5 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <button type="submit" disabled={uploading} className="btn-primary w-full">
        {uploading ? 'Uploading…' : 'Upload Document'}
      </button>
    </form>
  );
}
