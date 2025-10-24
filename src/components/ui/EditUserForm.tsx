import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

interface EditUserFormProps {
  userType: 'student' | 'teacher';
  userData: any;
  onClose: () => void;
  onUpdate: () => void;
}

const EditUserForm: React.FC<EditUserFormProps> = ({ userType, userData, onClose, onUpdate }) => {
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>(userData?.classes || []);
  const [selectedSections, setSelectedSections] = useState<string[]>(userData?.sections || []);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(userData?.subjects || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData(userData || {});
    setSelectedClasses(userData?.classes || []);
    setSelectedSections(userData?.sections || (userData?.section ? [userData.section] : []));
    setSelectedSubjects(userData?.subjects || []);
    if (userType === 'teacher') loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, userType]);

  const loadClasses = async () => {
    setLoading(true);
    const { data } = await supabase.from('classes').select('*').order('name');
    if (data) setAvailableClasses(data);
    setLoading(false);
  };

  useEffect(() => {
    updateAvailableSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      prev.includes(className) ? prev.filter(c => c !== className) : [...prev, className]
    );
  };

  const toggleSectionSelection = (section: string) => {
    setSelectedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const toggleSubjectSelection = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
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

      // ensure we don't send id
      delete payload.id;

      if (table === 'teachers') {
        payload.classes = selectedClasses;
        payload.sections = selectedSections;
        payload.subjects = selectedSubjects;
        if (selectedClasses.length === 0 || selectedSections.length === 0 || selectedSubjects.length === 0) {
          toast.error('Please select classes, sections and subjects');
          setSubmitting(false);
          return;
        }
      }

      if (table === 'students') {
        // when editing, section may be in formData.section or selectedSections
        if (!payload.class_name && selectedClasses.length > 0) payload.class_name = selectedClasses[0];
        if (!payload.section && selectedSections.length > 0) payload.section = selectedSections[0];

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

        if (classData) payload.class_id = classData.id;
      }

      if (!payload.password) delete payload.password; else payload.password = btoa(payload.password);

      const { error } = await supabase.from(table).update(payload).eq('id', userData.id);

      if (error) {
        console.error('Error updating user:', error);
        toast.error(`Failed to update ${userType}: ${error.message}`);
      } else {
        toast.success(`${userType === 'student' ? 'Student' : 'Teacher'} updated successfully`);
        onUpdate();
        onClose();
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      toast.error(err.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Edit {userType === 'student' ? 'Student' : 'Teacher'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-gray-500 mb-2">{userType === 'student' ? `Admission ID: ${userData?.admission_id}` : `Teacher ID: ${userData?.teacher_id}`}</div>

          <input type="password" placeholder="New Password (leave empty to keep current)" onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          <input type="text" placeholder="Name" required value={formData?.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          <input type="email" placeholder="Email" required value={formData?.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          <input type="tel" placeholder="Phone" value={formData?.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />

          {userType === 'student' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
                <select required value={formData?.class_name || ''} onChange={(e) => setFormData({ ...formData, class_name: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select Class</option>
                  {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                    <option key={num} value={num.toString()}>{num}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section *</label>
                <select required value={formData?.section || ''} onChange={(e) => setFormData({ ...formData, section: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                  <option value="">Select Section</option>
                  {formData?.class_name && parseInt(formData.class_name) >= 1 && parseInt(formData.class_name) <= 8 && (
                    <>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </>
                  )}
                  {formData?.class_name && parseInt(formData.class_name) >= 9 && parseInt(formData.class_name) <= 10 && (
                    <>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="NEEV">NEEV</option>
                    </>
                  )}
                </select>
              </div>

              <label className="text-sm text-gray-600">Date of Birth</label>
              <input type="date" placeholder="Date of Birth" required value={formData?.dob || ''} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />

              <label className="text-sm text-gray-600">Blood Group</label>
              <select value={formData?.blood_group || ''} onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
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

              <input type="text" placeholder="Father's Name" value={formData?.father_name || ''} onChange={(e) => setFormData({ ...formData, father_name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              <input type="text" placeholder="Mother's Name" value={formData?.mother_name || ''} onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              <input type="text" placeholder="Address" value={formData?.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              <input type="url" placeholder="Profile Photo URL" value={formData?.profile_photo || ''} onChange={(e) => setFormData({ ...formData, profile_photo: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
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
              <input type="url" placeholder="Profile Photo URL" value={formData?.profile_photo || ''} onChange={(e) => setFormData({ ...formData, profile_photo: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </>
          )}
          <button type="submit" disabled={submitting} className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">{submitting ? 'Updating...' : 'Update User'}</button>
        </form>
      </div>
    </div>
  );
};

export default EditUserForm;
