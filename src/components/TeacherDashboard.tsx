import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trash2, BookOpen } from 'lucide-react';
import MarksManagement from './MarksManagement';
import { supabase } from '../lib/supabase';

interface TeacherData {
  name: string;
  teacherId?: string;
  loggedAs?: string;
  profilePhoto?: string;
  classes?: string[];
  sections?: string[];
}

const TeacherDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Prefer route state, otherwise fall back to localStorage session
  let teacher: TeacherData | undefined = location.state?.user;
  let loggedUser: any = null;
  try {
    const raw = localStorage.getItem('loggedUser');
    if (raw) loggedUser = JSON.parse(raw);
  } catch (e) {
    loggedUser = null;
  }
  if (!teacher && loggedUser && loggedUser.loggedAs === 'teacher') {
    teacher = loggedUser as TeacherData;
  }

  const [activeTab, setActiveTab] = useState<'homework' | 'marks'>('homework');
  const [className, setClassName] = useState('IX');
  const [section, setSection] = useState('NEEV');
  const [availableClasses, setAvailableClasses] = useState<string[] | null>(null);
  const [availableSections, setAvailableSections] = useState<string[] | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [studentsCount, setStudentsCount] = useState<number | null>(null);
  const [teacherMap, setTeacherMap] = useState<Record<string,string>>({});

  const loadHomeworks = async () => {
    try {
      const { data } = await supabase
        .from('homework')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) setHomeworks(data);
    } catch (e) {
      console.error('Error loading homeworks:', e);
    }
  };

  useEffect(() => {
    loadHomeworks();
  }, []);

  // load teacher profile - prefer Supabase, fall back to local JSON files for demos
  useEffect(() => {
    (async () => {
      try {
        // find teacher id from location state or localStorage
        let rawUser: any = teacher;
        if (!rawUser) {
          const raw = localStorage.getItem('loggedUser');
          if (raw) rawUser = JSON.parse(raw);
        }
        const teacherId = rawUser?.teacherId || rawUser?.teacher_id || rawUser?.name || rawUser?.email;
        if (!teacherId) return;

        // Try Supabase first for teachers list
        let tList: any[] = [];
        try {
          const { data: teachersData, error: tError } = await supabase.from('teachers').select('*');
          if (tError) throw tError;
          if (Array.isArray(teachersData)) tList = teachersData;
        } catch (err) {
          // fallback to local JSON in public/data
          try {
            const tRes = await fetch('/data/teachers.json');
            if (tRes.ok) tList = await tRes.json();
          } catch (e) {
            // ignore fallback failure
          }
        }

        if (!Array.isArray(tList) || tList.length === 0) return;

        // Match teacher by various possible id fields
        const found = tList.find((t: any) => {
          const candidates = [t.teacher_id, t.teacherId, t.id, t.email, t.name];
          return candidates.some((c: any) => String(c) === String(teacherId));
        });

        if (found) {
          // Normalize some field names to match previous local JSON shape
          const normalized = {
            ...found,
            teacherId: found.teacher_id || found.teacherId || found.id || found.email || found.name,
            profilePhoto: found.profile_photo || found.profilePhoto || found.profilePhotoUrl || found.avatar,
            classes: Array.isArray(found.classes) ? found.classes : (found.class_list || found.classess || null),
            sections: Array.isArray(found.sections) ? found.sections : (found.section_list || null),
            subjects: Array.isArray(found.subjects) ? found.subjects : (found.subject_list || null)
          };

          setProfile(normalized);
          setAvailableClasses(Array.isArray(normalized.classes) ? normalized.classes.map((c: any) => String(c)) : null);
          setAvailableSections(Array.isArray(normalized.sections) ? normalized.sections.map((s: any) => String(s)) : null);
          if (Array.isArray(normalized.classes) && normalized.classes.length > 0) setClassName(String(normalized.classes[0]));
          if (Array.isArray(normalized.sections) && normalized.sections.length > 0) setSection(String(normalized.sections[0]));
          if (Array.isArray(normalized.subjects) && normalized.subjects.length > 0) setSubject(String(normalized.subjects[0]));
        }

        // also populate teacherMap for resolving createdBy (from tList)
        try {
          const teachersList = Array.isArray(tList) ? tList : [];
          const map: Record<string,string> = {};
          teachersList.forEach((t: any) => {
            const id = t.teacher_id || t.teacherId || t.id || t.email || t.name;
            const display = t.name || t.display_name || t.email || String(id);
            if (id) map[String(id)] = display;
            if (t.email) map[String(t.email)] = display;
            if (t.name) map[String(t.name)] = display;
          });
          setTeacherMap(map);
        } catch (e) {
          // ignore
        }

        // compute students count for classes/sections this teacher handles
        let users: any[] = [];
        try {
          const { data: studentsData, error: sError } = await supabase.from('students').select('*');
          if (!sError && Array.isArray(studentsData)) users = studentsData;
        } catch (e) {
          // fallback to users.json
          try {
            const uRes = await fetch('/data/users.json');
            if (uRes.ok) users = await uRes.json();
          } catch (e) {
            // ignore
          }
        }

        if (Array.isArray(users) && found && Array.isArray(found.classes) && found.classes.length > 0) {
          const classesSet = new Set(found.classes.map((c: any) => String(c).trim()));
          const sectionsSet = found.sections && Array.isArray(found.sections) ? new Set(found.sections.map((s: any) => String(s).trim().toLowerCase())) : null;
          const count = users.filter((u: any) => {
            // students in DB use roles implicitly by table; for demo JSON, keep previous roles check
            if (u.roles && Array.isArray(u.roles) && !u.roles.includes('student')) return false;
            const userClass = u.class_name || u.className || u.class || '';
            if (!classesSet.has(String(userClass).trim())) return false;
            if (sectionsSet) {
              const userSection = (u.section || u.section_name || '').toString().trim().toLowerCase();
              return sectionsSet.has(userSection);
            }
            return true;
          }).length;
          setStudentsCount(count);
        }
      } catch (e) {
        // ignore top-level errors
      }
    })();
  }, [teacher]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!title.trim()) {
      setMessage('Please provide a title for the homework.');
      return;
    }
    // validate class/section against available lists if provided
    if (availableClasses && !availableClasses.includes(className)) {
      setMessage(`You cannot assign homework to class ${className}.`);
      return;
    }
    if (availableSections && !availableSections.includes(section)) {
      setMessage(`You cannot assign homework to section ${section}.`);
      return;
    }

    try {
      // Get teacher from teachers table
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id, name')
        .eq('teacher_id', profile?.teacherId || teacher?.teacherId)
        .maybeSingle();

      const hw = {
        title: title.trim(),
        description: description.trim(),
        subject: subject || (profile?.subjects && profile.subjects[0]) || '',
        class_name: String(className).trim(),
        section: String(section).trim(),
        submission_date: submissionDate || null,
        created_by: teacherData?.id || null,
        teacher_name: teacherData?.name || profile?.name || teacher?.name || 'Teacher',
        status: 'active'
      };

      const { error } = await supabase.from('homework').insert(hw);

      if (error) {
        setMessage(`Error: ${error.message}`);
        return;
      }

      setMessage('Homework assigned successfully! Students in the class will see it.');
      setTitle('');
      setDescription('');
      setSubmissionDate('');
      loadHomeworks();
    } catch (e: any) {
      setMessage(`Could not save homework: ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this homework?')) return;
    try {
      const { error } = await supabase.from('homework').delete().eq('id', id);

      if (error) {
        setMessage(`Error deleting homework: ${error.message}`);
        return;
      }

      setMessage('Homework deleted successfully.');
      loadHomeworks();
    } catch (e: any) {
      setMessage(`Could not delete homework: ${e.message}`);
    }
  };

  if (!teacher) {
    // If someone is logged in but as a student, show a specific message
    if (loggedUser && loggedUser.loggedAs === 'student') {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">You are logged in as a student</h2>
            <p className="text-gray-600 mb-4">Use the Student Portal to access student features.</p>
            <button
              onClick={() => navigate('/student-dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Go to Student Portal
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please login to access your teacher dashboard</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
      <div className="bg-white rounded-3xl shadow-2xl border overflow-hidden">
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex space-x-3">
            <button
              onClick={() => setActiveTab('homework')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all shadow-sm ${
                activeTab === 'homework'
                  ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md'
              }`}
            >
              <BookOpen size={20} />
              <span>Homework</span>
            </button>
            <button
              onClick={() => setActiveTab('marks')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all shadow-sm ${
                activeTab === 'marks'
                  ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md'
              }`}
            >
              <BookOpen size={20} />
              <span>Marks Management</span>
            </button>
          </div>
        </div>
        <div className="p-8 bg-gradient-to-r from-blue-500 to-cyan-500">
          <div className="flex items-center gap-6">
            <div className="relative">
              <img src={profile?.profilePhoto || teacher.profilePhoto} alt="teacher" className="w-28 h-32 object-cover rounded-2xl border-4 border-white shadow-xl" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white"></div>
            </div>
            <div className="flex-1 text-white">
              <h2 className="text-3xl font-bold mb-2">{profile?.name || teacher.name}</h2>
              <div className="text-sm opacity-90 mb-3">Teacher ID: <span className="font-semibold">{profile?.teacherId || teacher.teacherId}</span></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-xs opacity-90 mb-1">Classes</div>
                  <div className="text-2xl font-bold">{profile?.classes ? profile.classes.length : '—'}</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-xs opacity-90 mb-1">Students</div>
                  <div className="text-2xl font-bold">{studentsCount ?? '—'}</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-xs opacity-90 mb-1">Homeworks</div>
                  <div className="text-2xl font-bold">{homeworks.length}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-white">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-xs opacity-75">Classes</div>
              <div className="text-sm font-medium mt-1">{(profile?.classes && profile.classes.length > 0) ? profile.classes.join(', ') : (teacher?.classes ? teacher.classes.join(', ') : '—')}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-xs opacity-75">Sections</div>
              <div className="text-sm font-medium mt-1">{(profile?.sections && profile.sections.length > 0) ? profile.sections.join(', ') : (teacher?.sections ? teacher.sections.join(', ') : '—')}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-xs opacity-75">Subjects</div>
              <div className="text-sm font-medium mt-1">{(profile?.subjects && profile.subjects.length > 0) ? profile.subjects.join(', ') : '—'}</div>
            </div>
          </div>
        </div>
        {activeTab === 'homework' ? (
          <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Assign Homework</h3>
              <p className="text-gray-600">Create and assign homework to your students</p>
            </div>
          <form onSubmit={handleAssign} className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-600">Class</label>
              {availableClasses ? (
                <select value={className} onChange={e => setClassName(e.target.value)} className="w-full mt-1 p-2 border rounded">
                  {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input value={className} onChange={e => setClassName(e.target.value)} className="w-full mt-1 p-2 border rounded" />
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600">Section</label>
              {availableSections ? (
                <select value={section} onChange={e => setSection(e.target.value)} className="w-full mt-1 p-2 border rounded">
                  {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input value={section} onChange={e => setSection(e.target.value)} className="w-full mt-1 p-2 border rounded" />
              )}
            </div>
            <div>
              <label className="text-sm text-gray-600">Submission date</label>
              <input type="date" value={submissionDate} onChange={e => setSubmissionDate(e.target.value)} className="w-full mt-1 p-2 border rounded" />
            </div>
            <div className="md:col-span-3">
              <label className="text-sm text-gray-600">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 p-2 border rounded" />
            </div>
            <div>
              <label className="text-sm text-gray-600">Subject</label>
              {profile?.subjects ? (
                <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full mt-1 p-2 border rounded">
                  {profile.subjects.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full mt-1 p-2 border rounded" />
              )}
            </div>
            <div className="md:col-span-3">
              <label className="text-sm text-gray-600">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 p-2 border rounded" />
            </div>
            </div>
            <div className="flex items-center gap-4">
              <button type="submit" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-3 rounded-xl font-medium hover:shadow-lg transition-all">Assign Homework</button>
              {message && <div className="text-sm font-medium text-green-600">{message}</div>}
            </div>
          </form>

          {homeworks.length > 0 && (
            <div className="mt-8">
              <h4 className="text-xl font-bold text-gray-800 mb-4">Recent Homeworks</h4>
              <div className="space-y-3">
                {homeworks.slice(0, 8).map(hw => (
                  <div key={hw.id} className="bg-white border-2 border-gray-100 rounded-xl p-5 hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Class {hw.class_name}</span>
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Section {hw.section}</span>
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">{hw.subject}</span>
                        </div>
                        <h5 className="font-bold text-lg text-gray-900 mb-1">{hw.title}</h5>
                        <p className="text-sm text-gray-600 mb-2">{hw.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>By: {hw.teacher_name || 'Teacher'}</span>
                          {hw.submission_date && <span>Due: {new Date(hw.submission_date).toLocaleDateString()}</span>}
                          <span>Posted: {new Date(hw.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(hw.id)} title="Delete" className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        ) : (
          <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
            <MarksManagement
              userRole="teacher"
              userId={profile?.teacherId || teacher?.teacherId || ''}
              teacherId={profile?.teacherId || teacher?.teacherId}
            />
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
