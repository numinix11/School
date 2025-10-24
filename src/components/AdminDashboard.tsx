import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Image as ImageIcon, Bell, BookOpen, LogOut, Plus, Trash2, Eye, EyeOff, X, GraduationCap, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import LoadingSpinner from './ui/LoadingSpinner';
import MarksManagement from './MarksManagement';
import EditUserForm from './ui/EditUserForm';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [admin, setAdmin] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'gallery' | 'notices' | 'marks'>('users');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminData = location.state?.user || JSON.parse(localStorage.getItem('loggedUser') || 'null');
    if (!adminData || adminData.loggedAs !== 'admin') {
      toast.error('Please login as administrator');
      navigate('/');
      return;
    }
    setAdmin(adminData);
    setLoading(false);
  }, [location, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('loggedUser');
    window.dispatchEvent(new CustomEvent('authChanged', { detail: null }));
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Administrator Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {admin?.name}</p>
            </div>
<button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </motion.div>

        <div className="flex gap-4 mb-6">
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'users' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <Users className="w-5 h-5" />
            Manage Users
          </button>
          <button onClick={() => setActiveTab('gallery')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'gallery' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <ImageIcon className="w-5 h-5" />
            Gallery
          </button>
          <button onClick={() => setActiveTab('notices')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'notices' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <Bell className="w-5 h-5" />
            Notices
          </button>
          <button onClick={() => setActiveTab('marks')} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'marks' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <GraduationCap className="w-5 h-5" />
            Marks Management
          </button>
        </div>

        <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl shadow-xl p-6">
          {activeTab === 'users' && <UsersManagement adminId={admin?.id} />}
          {activeTab === 'gallery' && <GalleryManagement adminId={admin?.id} />}
          {activeTab === 'notices' && <NoticesManagement adminId={admin?.id} />}
          {activeTab === 'marks' && <MarksManagement userRole="admin" userId={admin?.id} />}
        </motion.div>
      </div>
    </div>
  );
};

const UsersManagement: React.FC<{ adminId?: string }> = () => {
  const [userType, setUserType] = useState<'student' | 'teacher'>('student');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);

  useEffect(() => {
    loadUsers();
  }, [userType]);

  const loadUsers = async () => {
    setLoading(true);
    const table = userType === 'student' ? 'students' : 'teachers';
    const { data } = await supabase.from(table).select('*').order('name');
    if (data) setUsers(data);
    setLoading(false);
  };

  const handleDelete = (userId: string) => {
    setUserToDelete(userId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    setLoading(true);
    const table = userType === 'student' ? 'students' : 'teachers';
    
    // Get the user's email before deletion
    const { data: userData, error: fetchError } = await supabase
      .from(table)
      .select('email')
      .eq('id', userToDelete)
      .single();

    if (fetchError) {
      toast.error(`Failed to fetch user data: ${fetchError.message}`);
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', userToDelete);

    if (error) {
      toast.error(`Failed to delete ${userType}: ${error.message}`);
    } else {
      toast.success(`${userType.charAt(0).toUpperCase() + userType.slice(1)} deleted successfully`);
      loadUsers();
      
      // Dispatch a custom event for user deletion
      window.dispatchEvent(new CustomEvent('userDeleted', { 
        detail: { 
          email: userData.email,
          role: userType
        }
      }));
    }

    setShowDeleteModal(false);
    setUserToDelete(null);
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button onClick={() => setUserType('student')} className={`px-4 py-2 rounded-lg font-medium ${userType === 'student' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Students</button>
          <button onClick={() => setUserType('teacher')} className={`px-4 py-2 rounded-lg font-medium ${userType === 'teacher' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Teachers</button>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
          <Plus className="w-5 h-5" />
          Add {userType === 'student' ? 'Student' : 'Teacher'}
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((user) => (
            <div key={user.id} className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-100 rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:border-blue-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
                  <p className="text-sm text-blue-600 font-medium mt-1">{userType === 'student' ? `ID: ${user.admission_id}` : `ID: ${user.teacher_id}`}</p>
                  {userType === 'student' && (
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">Class {user.class_name}</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">Section {user.section}</span>
                    </div>
                  )}
                  {userType === 'teacher' && user.classes && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Classes: <span className="font-medium text-gray-700">{user.classes.join(', ')}</span></p>
                      {user.subjects && <p className="text-xs text-gray-500">Subjects: <span className="font-medium text-gray-700">{user.subjects.join(', ')}</span></p>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={() => setUserToEdit(user)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    title={`Edit ${userType}`}
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title={`Delete ${userType}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && <AddUserModal userType={userType} onClose={() => { setShowAddModal(false); loadUsers(); }} />}
      {userToEdit && (
        <EditUserForm
          userType={userType}
          userData={userToEdit}
          onClose={() => setUserToEdit(null)}
          onUpdate={loadUsers}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-xl font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this {userType}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const AddUserModal: React.FC<{ userType: 'student' | 'teacher'; onClose: () => void }> = ({ userType, onClose }) => {
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userType === 'teacher') {
      loadClasses();
    }
  }, [userType]);

  const loadClasses = async () => {
    setLoading(true);
    const { data } = await supabase.from('classes').select('*').order('name');
    if (data) {
      setAvailableClasses(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userType === 'teacher' && selectedClasses.length > 0) {
      updateAvailableSubjects();
    }
  }, [selectedClasses]);

  const updateAvailableSubjects = () => {
    const classNumbers = selectedClasses.map(c => parseInt(c)).filter(n => !isNaN(n));
    if (classNumbers.length === 0) {
      setAvailableSubjects([]);
      return;
    }

    const minClass = Math.min(...classNumbers);
    const maxClass = Math.max(...classNumbers);

    const subjects: string[] = [];
    if (minClass <= 5 && maxClass >= 1) {
      subjects.push('Hindi', 'English', 'Maths', 'EVS', 'Computer');
    }
    if (minClass <= 8 && maxClass >= 6) {
      if (!subjects.includes('Hindi')) subjects.push('Hindi');
      if (!subjects.includes('English')) subjects.push('English');
      if (!subjects.includes('Maths')) subjects.push('Maths');
      if (!subjects.includes('Computer')) subjects.push('Computer');
      subjects.push('S.St', 'Science');
    }
    if (minClass <= 10 && maxClass >= 9) {
      if (!subjects.includes('Hindi')) subjects.push('Hindi');
      if (!subjects.includes('English')) subjects.push('English');
      if (!subjects.includes('Maths')) subjects.push('Maths');
      if (!subjects.includes('S.St')) subjects.push('S.St');
      if (!subjects.includes('Science')) subjects.push('Science');
      subjects.push('AI');
    }

    setAvailableSubjects([...new Set(subjects)].sort());
  };

  const toggleClassSelection = (className: string) => {
    setSelectedClasses(prev =>
      prev.includes(className)
        ? prev.filter(c => c !== className)
        : [...prev, className]
    );
  };

  const toggleSectionSelection = (section: string) => {
    setSelectedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleSubjectSelection = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const getAvailableSectionsForClasses = () => {
    const classNumbers = selectedClasses.map(c => parseInt(c)).filter(n => !isNaN(n));
    const sections = new Set<string>();

    classNumbers.forEach(classNum => {
      if (classNum >= 1 && classNum <= 8) {
        sections.add('A');
        sections.add('B');
        sections.add('C');
      } else if (classNum >= 9 && classNum <= 10) {
        sections.add('A');
        sections.add('B');
        sections.add('C');
        sections.add('NEEV');
      }
    });

    return Array.from(sections).sort();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const table = userType === 'student' ? 'students' : 'teachers';
      const payload: any = { ...formData };

      if (table === 'teachers') {
        if (selectedClasses.length === 0) {
          toast.error('Please select at least one class');
          setSubmitting(false);
          return;
        }
        if (selectedSections.length === 0) {
          toast.error('Please select at least one section');
          setSubmitting(false);
          return;
        }
        if (selectedSubjects.length === 0) {
          toast.error('Please select at least one subject');
          setSubmitting(false);
          return;
        }

        payload.classes = selectedClasses;
        payload.sections = selectedSections;
        payload.subjects = selectedSubjects;
      }

      if (table === 'students') {
        if (!payload.class_name || !payload.section) {
          toast.error('Please select class and section');
          setSubmitting(false);
          return;
        }

        const { data: classData } = await supabase
          .from('classes')
          .select('id')
          .eq('name', payload.class_name)
          .eq('section', payload.section)
          .maybeSingle();

        if (classData) {
          payload.class_id = classData.id;
        }
      }

      payload.status = payload.status || 'active';

      if (payload.password) {
        payload.password = btoa(payload.password);
      }

      const { error } = await supabase.from(table).insert(payload);

      if (error) {
        console.error('Error adding user:', error);
        toast.error(`Failed to add ${userType}: ${error.message}`);
      } else {
        toast.success(`${userType === 'student' ? 'Student' : 'Teacher'} added successfully`);
        onClose();
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      toast.error(err.message || 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Add {userType === 'student' ? 'Student' : 'Teacher'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder={userType === 'student' ? 'Admission ID' : 'Teacher ID'} required onChange={(e) => setFormData({ ...formData, [userType === 'student' ? 'admission_id' : 'teacher_id']: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          <input type="password" placeholder="Password" required onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          <input type="text" placeholder="Name" required onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          <input type="email" placeholder="Email" required onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          <input type="tel" placeholder="Phone" onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          {userType === 'student' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
                <select required value={formData.class_name || ''} onChange={(e) => setFormData({ ...formData, class_name: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select Class</option>
                  {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                    <option key={num} value={num.toString()}>{num}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section *</label>
                <select required value={formData.section || ''} onChange={(e) => setFormData({ ...formData, section: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select Section</option>
                  {formData.class_name && parseInt(formData.class_name) >= 1 && parseInt(formData.class_name) <= 8 && (
                    <>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </>
                  )}
                  {formData.class_name && parseInt(formData.class_name) >= 9 && parseInt(formData.class_name) <= 10 && (
                    <>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="NEEV">NEEV</option>
                    </>
                  )}
                </select>
              </div>
            </>
          )}
          {userType === 'student' && (
            <>
              <label className="text-sm text-gray-600">Date of Birth</label>
              <input type="date" placeholder="Date of Birth" required onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />

              <label className="text-sm text-gray-600">Blood Group</label>
              <select required onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>

              <input type="text" placeholder="Father's Name" onChange={(e) => setFormData({ ...formData, father_name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              <input type="text" placeholder="Mother's Name" onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              <input type="text" placeholder="Address" onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              <input type="url" placeholder="Profile Photo URL" onChange={(e) => setFormData({ ...formData, profile_photo: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </>
          )}
          {userType === 'teacher' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Classes * (Select multiple)</label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                  {loading ? <LoadingSpinner size="sm" /> : (
                    <div className="grid grid-cols-5 gap-2">
                      {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                        <label key={num} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedClasses.includes(num.toString())}
                            onChange={() => toggleClassSelection(num.toString())}
                            className="rounded"
                          />
                          <span className="text-sm">{num}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {selectedClasses.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">Selected: {selectedClasses.join(', ')}</div>
                )}
              </div>

              {selectedClasses.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sections * (Select multiple)</label>
                  <div className="border rounded-lg p-3">
                    <div className="flex flex-wrap gap-2">
                      {getAvailableSectionsForClasses().map(section => (
                        <label key={section} className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-3 py-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedSections.includes(section)}
                            onChange={() => toggleSectionSelection(section)}
                            className="rounded"
                          />
                          <span className="text-sm font-medium">{section}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {selectedSections.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">Selected: {selectedSections.join(', ')}</div>
                  )}
                </div>
              )}

              {selectedClasses.length > 0 && availableSubjects.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subjects * (Select multiple)</label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {availableSubjects.map(subject => (
                        <label key={subject} className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-3 py-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedSubjects.includes(subject)}
                            onChange={() => toggleSubjectSelection(subject)}
                            className="rounded"
                          />
                          <span className="text-sm">{subject}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {selectedSubjects.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">Selected: {selectedSubjects.join(', ')}</div>
                  )}
                </div>
              )}
              <input type="url" placeholder="Profile Photo URL" onChange={(e) => setFormData({ ...formData, profile_photo: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </>
          )}
          <button type="submit" disabled={submitting} className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">{submitting ? 'Adding...' : 'Add User'}</button>
        </form>
      </div>
    </div>
  );
};

const GalleryManagement: React.FC<{ adminId?: string }> = ({ adminId }) => {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setLoading(true);
    const { data } = await supabase.from('gallery_images').select('*').order('display_order');
    if (data) setImages(data);
    setLoading(false);
  };

  const handleAddImage = async (imageData: any) => {
    const { error } = await supabase.from('gallery_images').insert({ ...imageData, uploaded_by: adminId || null });
    if (error) {
      console.error('Error adding image:', error);
      toast.error(`Failed to add image: ${error.message}`);
    } else {
      toast.success('Image added successfully');
      loadImages();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from('gallery_images').update({ is_active: !isActive }).eq('id', id);
    if (error) {
      console.error('Error updating image:', error);
      toast.error(`Failed to update image: ${error.message}`);
    } else {
      toast.success('Image status updated');
      loadImages();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    const { error } = await supabase.from('gallery_images').delete().eq('id', id);
    if (error) {
      console.error('Error deleting image:', error);
      toast.error(`Failed to delete image: ${error.message}`);
    } else {
      toast.success('Image deleted');
      loadImages();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Gallery Images</h2>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
          <Plus className="w-5 h-5" />
          Add Image
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <div key={image.id} className="border rounded-lg overflow-hidden">
              <img src={image.image_url} alt={image.title} className="w-full h-48 object-cover" />
              <div className="p-4">
                <h3 className="font-semibold">{image.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{image.description}</p>
                <div className="flex gap-2">
                  <button onClick={() => handleToggleActive(image.id, image.is_active)} className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg ${image.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {image.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {image.is_active ? 'Active' : 'Hidden'}
                  </button>
                  <button onClick={() => handleDelete(image.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && <AddImageModal onClose={() => setShowAddModal(false)} onSubmit={handleAddImage} />}
    </div>
  );
};

const AddImageModal: React.FC<{ onClose: () => void; onSubmit: (data: any) => void }> = ({ onClose, onSubmit }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ image_url: imageUrl, title, description, display_order: 0 });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Add Gallery Image</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="url" placeholder="Image URL" required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
          <input type="text" placeholder="Title" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-2 border rounded-lg" />
          <button type="submit" className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Add Image</button>
        </form>
      </div>
    </div>
  );
};

const NoticesManagement: React.FC<{ adminId?: string }> = ({ adminId }) => {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    setLoading(true);
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
    if (data) setNotices(data);
    setLoading(false);
  };

  const handleAddNotice = async (noticeData: any) => {
    const payload = {
      ...noticeData,
      created_by: adminId || null,
      is_active: true,
      date: noticeData.date || new Date().toISOString(),
    };

    const { error } = await supabase.from('notices').insert(payload);
    if (error) {
      console.error('Error adding notice:', error);
      toast.error(`Failed to add notice: ${error.message}`);
    } else {
      toast.success('Notice added successfully');
      loadNotices();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from('notices').update({ is_active: !isActive }).eq('id', id);
    if (error) {
      console.error('Error updating notice:', error);
      toast.error(`Failed to update notice: ${error.message}`);
    } else {
      toast.success('Notice status updated');
      loadNotices();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) {
      console.error('Error deleting notice:', error);
      toast.error(`Failed to delete notice: ${error.message}`);
    } else {
      toast.success('Notice deleted');
      loadNotices();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Notices</h2>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
          <Plus className="w-5 h-5" />
          Add Notice
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <div key={notice.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{notice.title}</h3>
                  <p className="text-gray-600 mt-1">{notice.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded ${notice.priority === 'high' ? 'bg-red-100 text-red-700' : notice.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{notice.priority}</span>
                    <span>{new Date(notice.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggleActive(notice.id, notice.is_active)} className={`p-2 rounded-lg ${notice.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {notice.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button onClick={() => handleDelete(notice.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && <AddNoticeModal onClose={() => setShowAddModal(false)} onSubmit={handleAddNotice} />}
    </div>
  );
};

const AddNoticeModal: React.FC<{ onClose: () => void; onSubmit: (data: any) => void }> = ({ onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, content, priority });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Add Notice</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Title" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
          <textarea placeholder="Content" required value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="w-full px-4 py-2 border rounded-lg" />
          <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full px-4 py-2 border rounded-lg">
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          <button type="submit" className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Add Notice</button>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;
