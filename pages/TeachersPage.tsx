import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Teacher } from '../types';
import Modal from '../components/Modal';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';

// Helper to handle image loading errors and fallback to a default avatar
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, teacherName: string) => {
    e.currentTarget.src = `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(teacherName)}`;
};

const TeacherForm: React.FC<{ teacher?: Teacher; onSave: (teacher: Teacher) => void; onCancel: () => void }> = ({ teacher, onSave, onCancel }) => {
  const [name, setName] = useState(teacher?.name || '');
  const [subject, setSubject] = useState(teacher?.subject || '');
  const [profilePicture, setProfilePicture] = useState(teacher?.profilePicture || '');
  const [imagePreview, setImagePreview] = useState<string | null>(teacher?.profilePicture || null);

  useEffect(() => {
    // Sync preview with profilePicture state
    setImagePreview(profilePicture || null);
  }, [profilePicture]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfilePicture(result);
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && subject) {
      onSave({
        id: teacher?.id || new Date().toISOString(),
        name,
        subject,
        profilePicture,
        workDays: teacher?.workDays || [1, 2, 3, 4, 5], // Default to Mon-Fri for new teachers
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {imagePreview ? (
                <img src={imagePreview} alt="Profile Preview" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
            ) : (
                <span className="text-xs text-gray-500 text-center">Tidak Ada Gambar</span>
            )}
        </div>
        <div className="flex-1">
             <label htmlFor="file-upload" className="cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Unggah Gambar
            </label>
            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
             {profilePicture && <button type="button" onClick={() => setProfilePicture('')} className="ml-2 text-sm text-red-600 hover:text-red-800">Hapus</button>}
        </div>
      </div>
      <div>
        <label htmlFor="profilePicture" className="block text-sm font-medium text-gray-700">Atau masukkan URL Foto</label>
        <input
          type="text"
          id="profilePicture"
          value={profilePicture}
          onChange={(e) => setProfilePicture(e.target.value)}
          placeholder="https://example.com/photo.jpg"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Guru</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        />
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Mata Pelajaran</label>
        <input
          type="text"
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        />
      </div>
       <div className="flex items-center justify-end pt-4 space-x-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Batal
        </button>
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Simpan
        </button>
      </div>
    </form>
  );
};


const TeachersPage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | undefined>(undefined);
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | undefined>(undefined);

  const handleSaveTeacher = (teacher: Teacher) => {
    if (state.teachers.some(t => t.id === teacher.id)) {
      dispatch({ type: 'UPDATE_TEACHER', payload: teacher });
    } else {
      dispatch({ type: 'ADD_TEACHER', payload: teacher });
    }
    closeModal();
  };

  const handleDeleteTeacher = (id: string) => {
    dispatch({ type: 'DELETE_TEACHER', payload: id });
    setDeletingTeacher(undefined);
  };
  
  const openModal = (teacher?: Teacher) => {
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingTeacher(undefined);
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">Daftar Guru</h3>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Tambah Guru
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">No</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Foto</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nama Guru</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Mata Pelajaran</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {state.teachers.length > 0 ? state.teachers.map((teacher, index) => (
              <tr key={teacher.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                 <td className="px-6 py-4 whitespace-nowrap">
                    <img 
                        className="h-10 w-10 rounded-full object-cover" 
                        src={teacher.profilePicture || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(teacher.name)}`} 
                        alt={teacher.name}
                        onError={(e) => handleImageError(e, teacher.name)}
                    />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">{teacher.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{teacher.subject}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button onClick={() => openModal(teacher)} className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-100 transition">
                    <EditIcon />
                  </button>
                  <button onClick={() => setDeletingTeacher(teacher)} className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition">
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            )) : (
                <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-500">
                        Tidak ada guru yang ditemukan. Silakan tambahkan guru baru.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingTeacher ? 'Edit Guru' : 'Tambah Guru'}>
        <TeacherForm teacher={editingTeacher} onSave={handleSaveTeacher} onCancel={closeModal} />
      </Modal>

      <Modal isOpen={!!deletingTeacher} onClose={() => setDeletingTeacher(undefined)} title="Konfirmasi Hapus">
        <p>Apakah Anda yakin ingin menghapus {deletingTeacher?.name}?</p>
        <div className="flex justify-end mt-4 space-x-2">
          <button onClick={() => setDeletingTeacher(undefined)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Batal</button>
          <button onClick={() => handleDeleteTeacher(deletingTeacher!.id)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700">Hapus</button>
        </div>
      </Modal>

    </div>
  );
};

export default TeachersPage;