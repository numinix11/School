import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Eye, EyeOff, X, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import LoadingSpinner from './ui/LoadingSpinner';

interface ClassSection {
  class: string;
  section: string;
}

interface Feature {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  class_sections?: ClassSection[];
}

const FeatureManagement: React.FC<{ adminId?: string }> = ({ adminId }) => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    setLoading(true);
    const { data: featuresData } = await supabase
      .from('features')
      .select('*')
      .order('created_at', { ascending: false });

    if (featuresData) {
      const featuresWithSections = await Promise.all(
        featuresData.map(async (feature) => {
          const { data: sections } = await supabase
            .from('feature_class_sections')
            .select('class_name, section')
            .eq('feature_id', feature.id);

          return {
            ...feature,
            class_sections: sections?.map(s => ({ class: s.class_name, section: s.section })) || [],
          };
        })
      );
      setFeatures(featuresWithSections);
    }
    setLoading(false);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('features')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast.error(`Failed to update feature: ${error.message}`);
    } else {
      toast.success('Feature status updated');
      loadFeatures();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feature?')) return;

    const { error } = await supabase.from('features').delete().eq('id', id);

    if (error) {
      toast.error(`Failed to delete feature: ${error.message}`);
    } else {
      toast.success('Feature deleted');
      loadFeatures();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Features Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Feature
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-100 rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:border-blue-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{feature.name}</h3>
                  {feature.description && (
                    <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                  )}

                  {feature.class_sections && feature.class_sections.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 font-medium mb-2">Assigned to:</p>
                      <div className="flex flex-wrap gap-2">
                        {feature.class_sections.map((cs, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
                          >
                            Class {cs.class} - Section {cs.section}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={() => handleToggleActive(feature.id, feature.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      feature.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={feature.is_active ? 'Active' : 'Inactive'}
                  >
                    {feature.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(feature.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="Delete feature"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {features.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No features added yet</p>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <AddFeatureModal
          adminId={adminId}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadFeatures}
        />
      )}
    </div>
  );
};

interface AddFeatureModalProps {
  adminId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AddFeatureModal: React.FC<AddFeatureModalProps> = ({ adminId, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [classSectionMappings, setClassSectionMappings] = useState<ClassSection[]>([]);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [currentClass, setCurrentClass] = useState<string | null>(null);

  const availableClasses = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

  const getAvailableSections = (classNum: string) => {
    const num = parseInt(classNum);
    if (num >= 1 && num <= 8) {
      return ['A', 'B', 'C'];
    } else if (num >= 9 && num <= 10) {
      return ['A', 'B', 'C', 'NEEV'];
    }
    return [];
  };

  const handleClassToggle = (className: string) => {
    if (selectedClasses.includes(className)) {
      setSelectedClasses(prev => prev.filter(c => c !== className));
      setClassSectionMappings(prev => prev.filter(cs => cs.class !== className));
    } else {
      setCurrentClass(className);
      setShowSectionDialog(true);
    }
  };

  const handleSectionSelection = (sections: string[]) => {
    if (!currentClass || sections.length === 0) {
      toast.error('Please select at least one section');
      return;
    }

    const newMappings = sections.map(section => ({
      class: currentClass,
      section: section,
    }));

    setClassSectionMappings(prev => [...prev, ...newMappings]);
    setSelectedClasses(prev => [...prev, currentClass]);
    setShowSectionDialog(false);
    setCurrentClass(null);
  };

  const handleRemoveMapping = (classNum: string, section: string) => {
    setClassSectionMappings(prev =>
      prev.filter(cs => !(cs.class === classNum && cs.section === section))
    );

    const remainingForClass = classSectionMappings.filter(
      cs => cs.class === classNum && !(cs.class === classNum && cs.section === section)
    );

    if (remainingForClass.length === 0) {
      setSelectedClasses(prev => prev.filter(c => c !== classNum));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a feature name');
      return;
    }

    if (classSectionMappings.length === 0) {
      toast.error('Please select at least one class-section combination');
      return;
    }

    setSubmitting(true);

    try {
      const { data: featureData, error: featureError } = await supabase
        .from('features')
        .insert({
          name: name.trim(),
          description: description.trim(),
          created_by: adminId || null,
          is_active: true,
        })
        .select()
        .single();

      if (featureError) throw featureError;

      const sectionsToInsert = classSectionMappings.map(cs => ({
        feature_id: featureData.id,
        class_name: cs.class,
        section: cs.section,
      }));

      const { error: sectionsError } = await supabase
        .from('feature_class_sections')
        .insert(sectionsToInsert);

      if (sectionsError) throw sectionsError;

      toast.success('Feature added successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding feature:', error);
      toast.error(error.message || 'Failed to add feature');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Add Feature</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feature Name *
              </label>
              <input
                type="text"
                placeholder="Enter feature name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                placeholder="Enter feature description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Classes *
              </label>
              <div className="border rounded-lg p-4">
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {availableClasses.map((classNum) => (
                    <button
                      key={classNum}
                      type="button"
                      onClick={() => handleClassToggle(classNum)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedClasses.includes(classNum)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {classNum}
                    </button>
                  ))}
                </div>

                {classSectionMappings.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Selected Class-Section Combinations:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {classSectionMappings.map((cs, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          <span>
                            Class {cs.class} - {cs.section}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMapping(cs.class, cs.section)}
                            className="hover:bg-blue-200 rounded-full p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Adding...' : 'Add Feature'}
            </button>
          </form>
        </motion.div>
      </div>

      <SectionSelectionDialog
        isOpen={showSectionDialog}
        classNum={currentClass || ''}
        availableSections={currentClass ? getAvailableSections(currentClass) : []}
        onConfirm={handleSectionSelection}
        onCancel={() => {
          setShowSectionDialog(false);
          setCurrentClass(null);
        }}
      />
    </>
  );
};

interface SectionSelectionDialogProps {
  isOpen: boolean;
  classNum: string;
  availableSections: string[];
  onConfirm: (sections: string[]) => void;
  onCancel: () => void;
}

const SectionSelectionDialog: React.FC<SectionSelectionDialogProps> = ({
  isOpen,
  classNum,
  availableSections,
  onConfirm,
  onCancel,
}) => {
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedSections([]);
    }
  }, [isOpen]);

  const handleToggleSection = (section: string) => {
    setSelectedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedSections);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-4">
              Select Sections for Class {classNum}
            </h3>

            <div className="space-y-3 mb-6">
              {availableSections.map((section) => (
                <label
                  key={section}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedSections.includes(section)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">Section {section}</span>
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(section)}
                    onChange={() => handleToggleSection(section)}
                    className="w-5 h-5 rounded"
                  />
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedSections.length === 0}
                className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FeatureManagement;
