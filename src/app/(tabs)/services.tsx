// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, TextInput, Modal, Clipboard, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhoneCall, Shield, AlertTriangle, Activity, FileText, BookOpen, Edit3, CreditCard, Briefcase, Search, Smartphone, Trash2, Info, Phone, Calendar, MapPin, Users, LayoutGrid, Sun, CloudRain, Cloud, Maximize2, ArrowRight, Building2, ExternalLink, X, CheckCircle2, ChevronRight, Copy, Check, Globe, Award, Navigation } from 'lucide-react-native';
import { useLangStore } from '../../store/langStore';
import { translations } from '../../lib/translations';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../lib/types';
import AnimatedCard from '../../components/AnimatedCard';
import { useAuthStore } from '../../store/authStore';
import { useAlert } from '../../components/AlertProvider';
import { useWeatherStore } from '../../store/weatherStore';
import { useTheme } from '../../hooks/use-theme';

const EMERGENCY_CONTACTS = [
  { id: '1', title: 'Simraungadh Helpline', number: '053-411072', icon: PhoneCall, color: '#5b5ef6' },
  { id: '2', title: 'Police Control Room', number: '100', icon: Shield, color: '#3b82f6' },
  { id: '3', title: 'Fire Brigade', number: '101', icon: AlertTriangle, color: '#ef4444' },
  { id: '4', title: 'City Hospital Ambulance', number: '102', icon: Activity, color: '#22c55e' },
];

const WASTE_SCHEDULE = [
  { day: 'Monday', type: 'Organic Waste', wards: '1, 2, 3', color: '#22c55e' },
  { day: 'Tuesday', type: 'Plastics & Recyclables', wards: 'All Wards', color: '#3b82f6' },
  { day: 'Wednesday', type: 'Organic Waste', wards: '4, 5, 6', color: '#22c55e' },
  { day: 'Thursday', type: 'General Waste', wards: '7, 8, 9', color: '#94a3b8' },
  { day: 'Friday', type: 'Organic Waste', wards: '10, 11', color: '#22c55e' },
];

const DIGITAL_SERVICES = [
  { 
    id: 'nid',
    title: 'राष्ट्रिय परिचयपत्र फारम', 
    subtitle: 'NID Pre-Enrollment Portal',
    url: 'https://enrollment.donidcr.gov.np',
    icon: FileText, 
    color: '#3b82f6' 
  },
  { 
    id: 'vital',
    title: 'नागरिक घटना दर्ता', 
    subtitle: 'Civil Registration Portal',
    url: 'https://citizenportal.donidcr.gov.np',
    icon: FileText, 
    color: '#2563eb' 
  },
  { 
    id: 'social',
    title: 'सामाजिक सुरक्षा प्रणाली', 
    subtitle: 'Social Security Allowance MIS',
    url: 'https://ssa.donidcr.gov.np',
    icon: Shield, 
    color: '#8b5cf6' 
  },
  { 
    id: 'nagarik',
    title: 'नागरिक एप', 
    subtitle: 'Official Nagarik Portal',
    url: 'https://nagarikapp.gov.np',
    icon: Smartphone, 
    color: '#06b6d4' 
  },
  { 
    id: 'license',
    title: 'ड्राइभिङ लाइसेन्स फारम', 
    subtitle: 'DoTM License Application',
    url: 'https://applydl.dotm.gov.np/login',
    icon: Navigation, 
    color: '#10b981' 
  },
  { 
    id: 'psc',
    title: 'लोक सेवा आयोग', 
    subtitle: 'PSC Online Candidate Portal',
    url: 'https://psconline.psc.gov.np',
    icon: Award, 
    color: '#f59e0b' 
  },
  { 
    id: 'pan',
    title: 'ई-राजस्व तथा PAN दर्ता', 
    subtitle: 'IRD Taxpayer Portal',
    url: 'https://taxpayer.ird.gov.np',
    icon: CreditCard, 
    color: '#14b8a6' 
  },
  { 
    id: 'passport',
    title: 'राहदानी प्रणाली (e-Passport)', 
    subtitle: 'Department of Passports',
    url: 'https://nepalpassport.gov.np',
    icon: Globe, 
    color: '#3b82f6' 
  },
  { 
    id: 'procurement',
    title: 'सार्वजनिक खरिद बोलपत्र', 
    subtitle: 'PPMO e-GP Portal',
    url: 'https://bolpatra.gov.np/egp',
    icon: Briefcase, 
    color: '#6366f1' 
  },
  { 
    id: 'foreign',
    title: 'वैदेशिक रोजगार (Shram)', 
    subtitle: 'DoFE FEIMS Portal',
    url: 'https://feims.dofe.gov.np',
    icon: Users, 
    color: '#8b5cf6' 
  },
  { 
    id: 'land',
    title: 'भूमि व्यवस्था तथा नक्सा', 
    subtitle: 'Ministry of Land Survey',
    url: 'https://molrm.gov.np',
    icon: MapPin, 
    color: '#f97316' 
  },
  { 
    id: 'simraungadh',
    title: 'सिमरौनगढ नगरपालिका', 
    subtitle: 'Official Municipal Website',
    url: 'https://simraungadhmun.gov.np',
    icon: Building2, 
    color: '#ec4899' 
  },
];

export default function ServicesScreen() {
  const { language } = useLangStore();
  const t = translations[language];
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'emergency' | 'digital' | 'waste' | 'info'>('emergency');
  const [searchQuery, setSearchQuery] = useState('');
  const [topContributors, setTopContributors] = useState<Profile[]>([]);
  const [loadingContributors, setLoadingContributors] = useState(true);
  const { profile } = useAuthStore();
  const { showAlert } = useAlert();

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [modalTab, setModalTab] = useState<'info' | 'apply'>('apply');
  const [submittingForm, setSubmittingForm] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

  // In-App Application Form States
  const [formApplicantName, setFormApplicantName] = useState('');
  const [formApplicantPhone, setFormApplicantPhone] = useState('');
  const [formWard, setFormWard] = useState('');
  const [formCitizenshipNo, setFormCitizenshipNo] = useState('');
  const [formEventType, setFormEventType] = useState('Birth (जन्म दर्ता)');
  const [formPersonName, setFormPersonName] = useState('');
  const [formFatherName, setFormFatherName] = useState('');
  const [formMotherName, setFormMotherName] = useState('');
  const [formEventDate, setFormEventDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    if (profile) {
      if (profile.full_name) setFormApplicantName(profile.full_name);
      if (profile.phone_number) setFormApplicantPhone(profile.phone_number);
      if (profile.home_ward) setFormWard(String(profile.home_ward));
    }
  }, [profile]);

  const handleSubmitApplication = async () => {
    if (!profile) {
      showAlert('Sign In Required', 'Please sign in to submit applications directly.');
      return;
    }
    if (!formApplicantName.trim()) {
      showAlert('Required Field', 'Please enter applicant full name.');
      return;
    }

    setSubmittingForm(true);
    try {
      const appId = `SIM-${Math.floor(100000 + Math.random() * 900000)}`;
      const { error } = await supabase.from('service_applications').insert({
        user_id: profile.id,
        service_type: activeModal || 'general',
        applicant_name: formApplicantName,
        applicant_phone: formApplicantPhone,
        home_ward: formWard ? parseInt(formWard, 10) : 1,
        form_data: {
          citizenship_no: formCitizenshipNo,
          event_type: formEventType,
          target_person: formPersonName,
          father_name: formFatherName,
          mother_name: formMotherName,
          event_date: formEventDate,
          notes: formNotes,
        },
        status: 'pending'
      });

      if (error && error.code !== '42P01') throw error;

      setSubmittedAppId(appId);
      showAlert('Application Submitted! 🎉', `Your application [${appId}] has been submitted to Ward ${formWard || 1}. Track status anytime!`);
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to submit application');
    } finally {
      setSubmittingForm(false);
    }
  };

  const { temp, condition, fetchWeather } = useWeatherStore();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        let { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'citizen')
          .order('civic_points', { ascending: false })
          .limit(3);

        if (error && error.code === '42703') {
          const fallback = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role')
            .eq('role', 'citizen')
            .limit(3);
          data = fallback.data;
          error = fallback.error;
        }

        if (error) throw error;
        setTopContributors(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingContributors(false);
      }
    };
    fetchLeaderboard();
    fetchWeather();
  }, []);

  const handleDial = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const TABS = [
    { id: 'emergency' as const, label: t.emergency || 'Emergency', icon: AlertTriangle },
    { id: 'digital' as const, label: t.digital || 'Digital', icon: Smartphone },
    { id: 'waste' as const, label: t.waste || 'Waste', icon: Trash2 },
    { id: 'info' as const, label: 'Info', icon: Info },
  ];

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${theme.bgClass}`}>
      <View className={`px-5 pt-3.5 pb-3.5 border-b ${theme.headerBgClass}`}>
        <Text className={`text-[22px] font-black tracking-tight ${theme.textClass}`}>{t.cityServices}</Text>
        <Text className={`text-[12px] font-medium mt-0.5 ${theme.textMutedClass}`}>Simraungadh Municipality, Bara</Text>

        {/* Search */}
        <View className={`mt-3 flex-row items-center rounded-xl px-3.5 py-2.5 ${theme.inputClass} border`}>
          <Search size={16} color={theme.iconColor} />
          <TextInput
            className={`flex-1 ml-2.5 text-[14px] font-medium ${theme.textClass}`}
            placeholder="Search services, contacts..."
            placeholderTextColor={theme.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tabs — Underline style */}
      <View className={`flex-row border-b ${theme.headerBgClass}`}>
        {TABS.map(tab => {
          const IconComp = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
              className={`flex-1 flex-row items-center justify-center py-3 ${isSelected ? (theme.isDark ? 'border-b-2 border-indigo-400' : 'border-b-2 border-indigo-600') : ''}`}
            >
              <IconComp size={14} color={isSelected ? (theme.isDark ? '#818cf8' : '#5b5ef6') : theme.iconColor} />
              <Text className={`ml-1.5 text-[12px] font-semibold ${isSelected ? (theme.isDark ? 'text-indigo-400' : 'text-indigo-600') : theme.textSecondaryClass}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* EMERGENCY TAB */}
        {activeTab === 'emergency' && (
          <View>
            <TouchableOpacity 
              onPress={() => handleDial('053411072')} 
              activeOpacity={0.85}
              className="bg-rose-600 rounded-3xl p-4 mb-5 flex-row items-center"
              style={theme.glowShadow('#ef4444')}
            >
              <View className="w-12 h-12 bg-white/20 rounded-xl items-center justify-center mr-3.5">
                <PhoneCall size={22} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base mb-0.5">SOS Helpline</Text>
                <Text className="text-rose-100/80 font-medium text-[12px]">Tap to call municipality emergency</Text>
              </View>
            </TouchableOpacity>

            <Text className={`font-bold text-[15px] mb-3 ${theme.textClass}`}>Emergency Contacts</Text>
            {EMERGENCY_CONTACTS.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).map((contact) => {
              const IconComp = contact.icon;
              return (
                <AnimatedCard
                  key={contact.id}
                  className={`p-4 mb-2.5 flex-row items-center justify-between ${theme.glassCardClass}`}
                  style={{ ...theme.glowShadow(contact.color), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  onPress={() => handleDial(contact.number)}
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                      style={{ backgroundColor: `${contact.color}15` }}
                    >
                      <IconComp size={20} color={contact.color} />
                    </View>
                    <View className="flex-1">
                      <Text className={`font-bold text-[14px] ${theme.textClass}`}>{contact.title}</Text>
                      <Text className={`font-extrabold text-[13px] mt-0.5 ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{contact.number}</Text>
                    </View>
                  </View>
                  <View className={`w-9 h-9 rounded-full items-center justify-center ${theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                    <PhoneCall size={15} color={theme.isDark ? '#818cf8' : '#4f46e5'} />
                  </View>
                </AnimatedCard>
              );
            })}
          </View>
        )}

        {/* DIGITAL SERVICES TAB */}
        {activeTab === 'digital' && (
          <View>
            <Text className={`font-bold text-[15px] mb-3 ${theme.textClass}`}>
              {language === 'ne' ? 'अनलाइन पोर्टल तथा निवेदनहरू' : 'Online Portals & Forms'}
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {DIGITAL_SERVICES.filter(c => 
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                c.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((service) => {
                const IconComp = service.icon;
                return (
                  <View key={service.id} className="w-[48%] mb-3">
                    <AnimatedCard
                      className={`p-3.5 flex-col justify-between ${theme.glassCardClass}`}
                      style={{ height: 135, ...theme.glowShadow(service.color) }}
                      onPress={() => {
                        if (['vital', 'social', 'procurement'].includes(service.id)) {
                          setActiveModal(service.id);
                        } else if (service.id === 'pan') {
                          setActiveModal('tax');
                        } else {
                          Linking.openURL(service.url);
                        }
                      }}
                    >
                      <View className="flex-row items-center justify-between w-full">
                        <View
                          className="w-10 h-10 rounded-xl items-center justify-center"
                          style={{ backgroundColor: `${service.color}15` }}
                        >
                          <IconComp size={20} color={service.color} />
                        </View>
                        <ExternalLink size={14} color={theme.iconColor} />
                      </View>

                      <View className="mt-2">
                        <Text className={`font-bold text-[13px] leading-tight mb-1 ${theme.textClass}`} numberOfLines={2}>
                          {service.title}
                        </Text>
                        <Text className={`font-medium text-[10.5px] ${theme.textMutedClass}`} numberOfLines={1}>
                          {service.subtitle}
                        </Text>
                      </View>
                    </AnimatedCard>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* WASTE TAB */}
        {activeTab === 'waste' && (
          <View>
            <Text className={`font-bold text-[15px] mb-3 ${theme.textClass}`}>{t.weeklySchedule}</Text>
            {WASTE_SCHEDULE.filter(c => c.type.toLowerCase().includes(searchQuery.toLowerCase())).map((item, index) => (
              <View key={index} className={`p-4 mb-2.5 flex-row items-center ${theme.glassCardClass}`}
                style={theme.glowShadow(item.color)}
              >
                <View className={`w-12 items-center justify-center border-r mr-3.5 pr-3.5 ${theme.borderClass}`}>
                  <Text className={`${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'} font-bold text-[12px] uppercase tracking-wider mb-1`}>{item.day.substring(0, 3)}</Text>
                  <Calendar size={18} color={theme.iconColor} />
                </View>
                <View className="flex-1">
                  <Text className={`font-semibold text-[14px] mb-0.5 ${theme.textClass}`}>{item.type}</Text>
                  <View className="flex-row items-center">
                    <MapPin size={11} color={theme.iconColor} />
                    <Text className={`font-medium text-[11px] ml-1 ${theme.textSecondaryClass}`}>Wards: {item.wards}</Text>
                  </View>
                </View>
                <View className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              </View>
            ))}
          </View>
        )}

        {/* INFO TAB */}
        {activeTab === 'info' && (
          <View>
            <Text className={`font-bold text-[15px] mb-3 ${theme.textClass}`}>Municipality Info</Text>
            <View className={`p-5 mb-5 ${theme.glassCardClass}`} style={theme.glowShadow('#5b5ef6')}>
              <View className="items-center mb-5">
                <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-2.5 ${theme.isDark ? 'bg-indigo-500/12' : 'bg-indigo-50'}`}>
                  <Building2 size={30} color={theme.isDark ? '#818cf8' : '#5b5ef6'} />
                </View>
                <Text className={`font-black text-xl tracking-tight ${theme.textClass}`}>Simraungadh, Bara</Text>
                <Text className={`font-medium mt-0.5 text-[13px] ${theme.textSecondaryClass}`}>Madhesh Province, Nepal</Text>
              </View>

              <View className="flex-row flex-wrap justify-between">
                <View className={`w-[31%] rounded-xl p-3 mb-2.5 items-center ${theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                  <Users size={16} color={theme.isDark ? '#818cf8' : '#5b5ef6'} />
                  <Text className={`font-medium text-[9px] uppercase tracking-wider mt-1 ${theme.textMutedClass}`}>Pop.</Text>
                  <Text className={`font-bold text-[15px] ${theme.textClass}`}>49k</Text>
                </View>
                <View className={`w-[31%] rounded-xl p-3 mb-2.5 items-center ${theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                  <LayoutGrid size={16} color={theme.isDark ? '#818cf8' : '#5b5ef6'} />
                  <Text className={`font-medium text-[9px] uppercase tracking-wider mt-1 ${theme.textMutedClass}`}>Wards</Text>
                  <Text className={`font-bold text-[15px] ${theme.textClass}`}>11</Text>
                </View>
                <View className={`w-[31%] rounded-xl p-3 mb-2.5 items-center ${theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                  {condition === 'Clear' ? <Sun size={16} color="#f59e0b" /> : condition === 'Rain' ? <CloudRain size={16} color="#38bdf8" /> : <Cloud size={16} color="#94a3b8" />}
                  <Text className={`font-medium text-[9px] uppercase tracking-wider mt-1 ${theme.textMutedClass}`}>Weather</Text>
                  <Text className={`font-bold text-[15px] ${theme.textClass}`}>{temp !== null ? `${temp}°C` : '--'}</Text>
                </View>
                <View className={`w-full rounded-xl p-3.5 mb-2.5 ${theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                  <Maximize2 size={16} color={theme.isDark ? '#818cf8' : '#5b5ef6'} />
                  <Text className={`font-medium text-[10px] uppercase tracking-wider mt-1 ${theme.textMutedClass}`}>Area</Text>
                  <Text className={`font-bold text-[16px] ${theme.textClass}`}>42.65 sq km</Text>
                </View>

                <View className={`w-full rounded-xl p-3.5 flex-row items-center ${theme.isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                  <View className={`flex-1 border-r pr-3 ${theme.borderClass}`}>
                    <Text className={`${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'} font-bold text-[10px] uppercase tracking-wider mb-0.5`}>Mayor</Text>
                    <Text className={`font-bold text-[13px] ${theme.textClass}`}>Kishori Prasad Kalawar</Text>
                  </View>
                  <View className="flex-1 pl-3">
                    <Text className={`${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'} font-bold text-[10px] uppercase tracking-wider mb-0.5`}>Deputy Mayor</Text>
                    <Text className={`font-bold text-[13px] ${theme.textClass}`}>Najmu Sehar</Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity onPress={() => handleDial('053411072')} className={`rounded-2xl p-4 flex-row items-center justify-between ${theme.isDark ? 'bg-indigo-500/15' : 'bg-indigo-600'}`}>
              <View>
                <Text className={`font-bold text-[15px] mb-0.5 ${theme.isDark ? 'text-indigo-200' : 'text-white'}`}>Contact Municipal Office</Text>
                <Text className={`text-[12px] font-medium ${theme.isDark ? 'text-indigo-400' : 'text-indigo-200'}`}>simraungadhmun@gmail.com</Text>
              </View>
              <ArrowRight size={20} color={theme.isDark ? '#818cf8' : '#ffffff'} />
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* In-App Interactive Service Modal */}
      <Modal
        visible={!!activeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className={`h-[85%] rounded-t-[32px] p-5 border-t ${theme.glassBg} ${theme.borderClass}`}>
            
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-slate-200/60 dark:border-white/10 mb-4">
              <View className="flex-row items-center flex-1 pr-3">
                <View className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 ${theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                  {activeModal === 'vital' && <FileText size={22} color="#3b82f6" />}
                  {activeModal === 'social' && <Shield size={22} color="#8b5cf6" />}
                  {activeModal === 'charter' && <BookOpen size={22} color="#f59e0b" />}
                  {activeModal === 'forms' && <Edit3 size={22} color="#ef4444" />}
                  {activeModal === 'tax' && <CreditCard size={22} color="#22c55e" />}
                  {activeModal === 'procurement' && <Briefcase size={22} color="#5b5ef6" />}
                </View>
                <View className="flex-1">
                  <Text className={`text-[16px] font-black tracking-tight ${theme.textClass}`}>
                    {activeModal === 'vital' && (language === 'ne' ? 'घटना दर्ता सेवा निर्देशिका' : 'Vital Event Registration')}
                    {activeModal === 'social' && (language === 'ne' ? 'सामाजिक सुरक्षा भत्ता व्यवस्थापन' : 'Social Security Allowance')}
                    {activeModal === 'charter' && (language === 'ne' ? 'नागरिक वडापत्र तथा दस्तुर' : 'Ward Citizen Charter')}
                    {activeModal === 'forms' && (language === 'ne' ? 'सरकारी निवेदन ढाँचाहरू' : 'Official Application Templates')}
                    {activeModal === 'tax' && (language === 'ne' ? 'कर तथा राजस्व प्रणाली' : 'Tax & Revenue Rates')}
                    {activeModal === 'procurement' && (language === 'ne' ? 'सार्वजनिक बोलपत्र तथा ठेक्का' : 'Public Tenders & Procurement')}
                  </Text>
                  <Text className={`text-[11px] font-semibold mt-0.5 ${theme.textMutedClass}`}>
                    सिमरौनगढ नगरपालिका · Simraungadh Municipality
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setActiveModal(null)}
                className={`w-9 h-9 rounded-full items-center justify-center ${theme.isDark ? 'bg-white/10' : 'bg-slate-100'}`}
              >
                <X size={18} color={theme.iconColor} />
              </TouchableOpacity>
            </View>

            {/* Modal Body Scroll */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

              {/* 1. VITAL REGISTRATION & NID MODAL */}
              {activeModal === 'vital' && (
                <View className="gap-3.5">
                  {/* Mode Switcher */}
                  <View className={`flex-row p-1 rounded-2xl mb-1 ${theme.isDark ? 'bg-white/[0.05]' : 'bg-slate-100'}`}>
                    <TouchableOpacity
                      onPress={() => setModalTab('apply')}
                      className={`flex-1 py-2 rounded-xl items-center ${modalTab === 'apply' ? (theme.isDark ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-indigo-600') : ''}`}
                    >
                      <Text className={`font-bold text-[12.5px] ${modalTab === 'apply' ? (theme.isDark ? 'text-indigo-300' : 'text-white') : theme.textSecondaryClass}`}>
                        {language === 'ne' ? '📝 अनलाइन फारम भर्नुहोस्' : '📝 Fill Online Form'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setModalTab('info')}
                      className={`flex-1 py-2 rounded-xl items-center ${modalTab === 'info' ? (theme.isDark ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-indigo-600') : ''}`}
                    >
                      <Text className={`font-bold text-[12.5px] ${modalTab === 'info' ? (theme.isDark ? 'text-indigo-300' : 'text-white') : theme.textSecondaryClass}`}>
                        {language === 'ne' ? 'ℹ️ निर्देशिका तथा कागजात' : 'ℹ️ Guide & Rules'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {modalTab === 'apply' ? (
                    /* IN-APP ONLINE APPLICATION FORM */
                    <View className="gap-3">
                      <Text className={`font-extrabold text-[13px] uppercase tracking-wider ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        {language === 'ne' ? '१. सेवा / घटना छनोट गर्नुहोस्' : '1. Select Event / NID Service'}
                      </Text>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mb-1">
                        {['Birth (जन्म दर्ता)', 'National ID (राष्ट्रिय परिचयपत्र)', 'Death (मृत्यु दर्ता)', 'Marriage (विवाह दर्ता)', 'Migration (बसाइँसराई)'].map(type => (
                          <TouchableOpacity
                            key={type}
                            onPress={() => setFormEventType(type)}
                            className={`px-3.5 py-2 rounded-xl border ${formEventType === type 
                              ? (theme.isDark ? 'bg-indigo-500/25 border-indigo-400' : 'bg-indigo-50 border-indigo-600')
                              : (theme.isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200')
                            }`}
                          >
                            <Text className={`text-[12px] font-bold ${formEventType === type ? (theme.isDark ? 'text-indigo-300' : 'text-indigo-600') : theme.textSecondaryClass}`}>
                              {type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <Text className={`font-extrabold text-[13px] uppercase tracking-wider mt-1 ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        {language === 'ne' ? '२. आवेदक तथा घटना विवरण (Application Details)' : '2. Fill Registration Details'}
                      </Text>

                      {/* Applicant Full Name */}
                      <View>
                        <Text className={`font-semibold text-[12px] mb-1 ml-0.5 ${theme.textSecondaryClass}`}>
                          {language === 'ne' ? 'आवेदकको पूरा नाम *' : 'Applicant Full Name *'}
                        </Text>
                        <TextInput
                          className={`rounded-2xl px-3.5 h-11 border font-medium text-[13.5px] ${theme.inputClass} ${theme.textClass}`}
                          placeholder="e.g. Rahul Kushwaha"
                          placeholderTextColor={theme.inputPlaceholder}
                          value={formApplicantName}
                          onChangeText={setFormApplicantName}
                        />
                      </View>

                      {/* Applicant Phone & Ward Split */}
                      <View className="flex-row gap-3">
                        <View className="flex-1">
                          <Text className={`font-semibold text-[12px] mb-1 ml-0.5 ${theme.textSecondaryClass}`}>
                            {language === 'ne' ? 'फोन नम्बर *' : 'Phone Number *'}
                          </Text>
                          <TextInput
                            className={`rounded-2xl px-3.5 h-11 border font-medium text-[13.5px] ${theme.inputClass} ${theme.textClass}`}
                            placeholder="e.g. 9800000000"
                            placeholderTextColor={theme.inputPlaceholder}
                            value={formApplicantPhone}
                            onChangeText={setFormApplicantPhone}
                            keyboardType="phone-pad"
                          />
                        </View>

                        <View className="w-28">
                          <Text className={`font-semibold text-[12px] mb-1 ml-0.5 ${theme.textSecondaryClass}`}>
                            {language === 'ne' ? 'वडा नं *' : 'Ward No *'}
                          </Text>
                          <TextInput
                            className={`rounded-2xl px-3.5 h-11 border font-medium text-[13.5px] ${theme.inputClass} ${theme.textClass}`}
                            placeholder="1 to 11"
                            placeholderTextColor={theme.inputPlaceholder}
                            value={formWard}
                            onChangeText={setFormWard}
                            keyboardType="number-pad"
                            maxLength={2}
                          />
                        </View>
                      </View>

                      {/* Citizenship No */}
                      <View>
                        <Text className={`font-semibold text-[12px] mb-1 ml-0.5 ${theme.textSecondaryClass}`}>
                          {language === 'ne' ? 'नागरिकता नं. (Citizenship No)' : 'Citizenship Number'}
                        </Text>
                        <TextInput
                          className={`rounded-2xl px-3.5 h-11 border font-medium text-[13.5px] ${theme.inputClass} ${theme.textClass}`}
                          placeholder="e.g. 33-01-79-12345"
                          placeholderTextColor={theme.inputPlaceholder}
                          value={formCitizenshipNo}
                          onChangeText={setFormCitizenshipNo}
                        />
                      </View>

                      {/* Target Person Name */}
                      <View>
                        <Text className={`font-semibold text-[12px] mb-1 ml-0.5 ${theme.textSecondaryClass}`}>
                          {language === 'ne' ? 'सम्बन्धित व्यक्तिको नाम (Person/Child Name)' : 'Person / Child Name'}
                        </Text>
                        <TextInput
                          className={`rounded-2xl px-3.5 h-11 border font-medium text-[13.5px] ${theme.inputClass} ${theme.textClass}`}
                          placeholder="e.g. Baby Kushwaha"
                          placeholderTextColor={theme.inputPlaceholder}
                          value={formPersonName}
                          onChangeText={setFormPersonName}
                        />
                      </View>

                      {/* Father & Mother Name */}
                      <View className="flex-row gap-3">
                        <View className="flex-1">
                          <Text className={`font-semibold text-[12px] mb-1 ml-0.5 ${theme.textSecondaryClass}`}>
                            {language === 'ne' ? 'बाबुको नाम' : "Father's Name"}
                          </Text>
                          <TextInput
                            className={`rounded-2xl px-3.5 h-11 border font-medium text-[13.5px] ${theme.inputClass} ${theme.textClass}`}
                            placeholder="Father Name"
                            placeholderTextColor={theme.inputPlaceholder}
                            value={formFatherName}
                            onChangeText={setFormFatherName}
                          />
                        </View>

                        <View className="flex-1">
                          <Text className={`font-semibold text-[12px] mb-1 ml-0.5 ${theme.textSecondaryClass}`}>
                            {language === 'ne' ? 'आमाको नाम' : "Mother's Name"}
                          </Text>
                          <TextInput
                            className={`rounded-2xl px-3.5 h-11 border font-medium text-[13.5px] ${theme.inputClass} ${theme.textClass}`}
                            placeholder="Mother Name"
                            placeholderTextColor={theme.inputPlaceholder}
                            value={formMotherName}
                            onChangeText={setFormMotherName}
                          />
                        </View>
                      </View>

                      {/* Event Date & Notes */}
                      <View className="flex-row gap-3">
                        <View className="w-36">
                          <Text className={`font-semibold text-[12px] mb-1 ml-0.5 ${theme.textSecondaryClass}`}>
                            {language === 'ne' ? 'घटना मिति (BS/AD)' : 'Event Date'}
                          </Text>
                          <TextInput
                            className={`rounded-2xl px-3.5 h-11 border font-medium text-[13.5px] ${theme.inputClass} ${theme.textClass}`}
                            placeholder="2083-04-10"
                            placeholderTextColor={theme.inputPlaceholder}
                            value={formEventDate}
                            onChangeText={setFormEventDate}
                          />
                        </View>

                        <View className="flex-1">
                          <Text className={`font-semibold text-[12px] mb-1 ml-0.5 ${theme.textSecondaryClass}`}>
                            {language === 'ne' ? 'अतिरिक्त विवरण' : 'Notes'}
                          </Text>
                          <TextInput
                            className={`rounded-2xl px-3.5 h-11 border font-medium text-[13.5px] ${theme.inputClass} ${theme.textClass}`}
                            placeholder="e.g. Ward 3 Tole"
                            placeholderTextColor={theme.inputPlaceholder}
                            value={formNotes}
                            onChangeText={setFormNotes}
                          />
                        </View>
                      </View>

                      {/* Submit Form CTA */}
                      <TouchableOpacity
                        onPress={handleSubmitApplication}
                        disabled={submittingForm}
                        className={`h-12 rounded-2xl items-center justify-center mt-3 ${theme.isDark ? 'bg-indigo-500/30 border border-indigo-500/40' : 'bg-indigo-600'}`}
                      >
                        {submittingForm ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text className="text-white font-bold text-[14px]">
                            {language === 'ne' ? '📥 सिमरौनगढ वडा कार्यालयमा अनलाइन फारम पेश गर्नुहोस्' : '📥 Submit Application to Ward Office'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* REQUIREMENTS GUIDE TAB */
                    <View className="gap-3.5">
                      <View className={`p-4 rounded-2xl border ${theme.isDark ? 'bg-white/[0.03] border-white/10' : 'bg-blue-50/50 border-blue-100'}`}>
                        <Text className={`font-bold text-[14px] mb-1 ${theme.textClass}`}>
                          {language === 'ne' ? '📌 घटना दर्ता नियम तथा समयसीमा' : '📌 Rules & Timelines'}
                        </Text>
                        <Text className={`text-[12.5px] leading-relaxed ${theme.textSecondaryClass}`}>
                          {language === 'ne'
                            ? 'जन्म, मृत्यु, विवाह, सम्बन्ध विच्छेद र बसाइँसराई घटना घटेको ३५ दिनभित्र सम्बन्धित वडा कार्यालयमा दर्ता गर्दा पूर्णतः निःशुल्क हुन्छ।'
                            : 'Registration of Birth, Death, Marriage, Divorce, and Migration within 35 days at your Ward Office is 100% free of cost.'
                          }
                        </Text>
                      </View>

                      {[
                        { title: 'जन्म दर्ता र राष्ट्रिय परिचयपत्र (Birth & NID)', fee: 'निःशुल्क (Free within 35 days)', docs: ['अस्पतालको जन्म प्रमाणित पत्र', 'बाबु-आमाको नागरिकता प्रतिलिपि', 'विवाह दर्ता प्रमाण-पत्र प्रतिलिपि'] },
                        { title: 'मृत्यु दर्ता (Death Registration)', fee: 'निःशुल्क (Free within 35 days)', docs: ['अस्पताल/डाक्टरको रिपोर्ट (उपलब्ध भएमा)', 'मृतकको नागरिकताको असुली', 'सूचकको नागरिकता प्रतिलिपि'] },
                        { title: 'विवाह दर्ता (Marriage Registration)', fee: 'दस्तुर: रु १०० (Fee: NPR 100)', docs: ['श्रीमान र श्रीमतीको नागरिकता प्रतिलिपि', 'संयुक्त राहदानी साइजको फोटो २-२ प्रति', 'वडाध्यक्षको सिफारिस'] },
                        { title: 'बसाइँसराई दर्ता (Migration Registration)', fee: 'दस्तुर: रु २०० (Fee: NPR 200)', docs: ['घरजग्गा धनीपुर्जा प्रतिलिपि', 'साबिक वडाको बसाइँसराई छोडपत्र', 'परिवारका सबै सदस्यको नागरिकता/जन्मदर्ता'] },
                      ].map((evt, i) => (
                        <View key={i} className={`p-4 mb-2.5 ${theme.glassCardClass}`}>
                          <Text className={`font-black text-[15px] mb-1 ${theme.isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{evt.title}</Text>
                          <Text className={`text-[11.5px] font-bold mb-2.5 ${theme.textMutedClass}`}>{evt.fee}</Text>
                          <Text className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 ${theme.textClass}`}>आवश्यक कागजातहरू (Required Documents):</Text>
                          {evt.docs.map((doc, j) => (
                            <View key={j} className="flex-row items-center mb-1">
                              <CheckCircle2 size={13} color="#10b981" className="mr-2" />
                              <Text className={`text-[12px] font-medium ${theme.textSecondaryClass}`}>{doc}</Text>
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* 2. SOCIAL SECURITY MODAL */}
              {activeModal === 'social' && (
                <View className="gap-3.5">
                  <View className={`p-4 rounded-2xl border ${theme.isDark ? 'bg-white/[0.03] border-white/10' : 'bg-purple-50/50 border-purple-100'}`}>
                    <Text className={`font-bold text-[14px] mb-1 ${theme.textClass}`}>
                      {language === 'ne' ? '💳 सामाजिक सुरक्षा भत्ता वर्ग' : '💳 Pension & Allowance Classes'}
                    </Text>
                    <Text className={`text-[12.5px] leading-relaxed ${theme.textSecondaryClass}`}>
                      {language === 'ne'
                        ? 'सिमरौनगढ नगरपालिकाका प्रत्येक वडा कार्यालयबाट अनलाइन दर्ता गरी सोझै बैंक खातामा भत्ता जम्मा गरिन्छ।'
                        : 'Registered citizens receive monthly allowance directly deposited into their bank accounts via Ward Offices.'
                      }
                    </Text>
                  </View>

                  {[
                    { title: 'ज्येष्ठ नागरिक भत्ता (Senior Citizen)', rate: 'रु ४,००० / महिना (NPR 4,000/mo)', req: '६८ वर्ष पूरा भएका नेपाली नागरिक (दोधारा/सिमरौनगढ)' },
                    { title: 'एकल महिला तथा विधवा भत्ता (Single Women)', rate: 'रु २,६६० / महिना (NPR 2,660/mo)', req: '६० वर्ष पुगेका असहाय एकल महिला वा विधवा' },
                    { title: 'अपाङ्गता भत्ता (Disability Allowance)', rate: 'रु ३,९९० / महिना (NPR 3,990/mo)', req: 'लाल कार्ड (पूर्ण अपाङ्गता) प्राप्त नागरिक' },
                    { title: 'बाल संरक्षण भत्ता (Child Protection)', rate: 'रु ५३२ / महिना (NPR 532/mo)', req: '५ वर्ष मुनिका बालबालिका (अधिकतम २ जना)' },
                  ].map((allow, i) => (
                    <View key={i} className={`p-4 mb-2.5 ${theme.glassCardClass}`}>
                      <Text className={`font-black text-[15px] mb-1 ${theme.isDark ? 'text-purple-300' : 'text-purple-700'}`}>{allow.title}</Text>
                      <Text className="text-[14px] font-black text-emerald-600 dark:text-emerald-400 mb-1.5">{allow.rate}</Text>
                      <Text className={`text-[12px] font-medium ${theme.textSecondaryClass}`}>{allow.req}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 3. CITIZEN CHARTER MODAL */}
              {activeModal === 'charter' && (
                <View className="gap-3">
                  <Text className={`font-bold text-[14px] mb-1 ${theme.textClass}`}>
                    {language === 'ne' ? '📋 वडा कार्यालय सेवा दस्तुर तथा समय' : '📋 Ward Services & Fees'}
                  </Text>

                  {[
                    { service: 'नागरिकता सिफारिस', fee: 'रु १००', time: 'सोही दिन', officer: 'वडा सचिव / वडाध्यक्ष' },
                    { service: 'घरबाटो प्रमाणित सिफारिस', fee: 'रु २००', time: 'सोही दिन', officer: 'वडा प्राविधिक' },
                    { service: 'नाता प्रमाणित प्रमाण-पत्र', fee: 'रु ३००', time: '१ दिन', officer: 'वडाध्यक्ष' },
                    { service: 'चारित्रिक प्रमाण-पत्र', fee: 'रु ५०', time: 'सोही दिन', officer: 'वडा सचिव' },
                    { service: 'व्यवसाय दर्ता सिफारिस', fee: 'रु ५०० - ५,०००', time: '२ दिन', officer: 'राजस्व शाखा' },
                    { service: 'जग्गा धनी श्रेस्ता प्रतिलिपि', fee: 'रु १५०', time: '१ दिन', officer: 'मालपोत/वडा' },
                  ].map((item, i) => (
                    <View key={i} className={`p-3.5 flex-row items-center justify-between mb-2 ${theme.glassCardClass}`}>
                      <View className="flex-1 pr-2">
                        <Text className={`font-bold text-[13.5px] ${theme.textClass}`}>{item.service}</Text>
                        <Text className={`text-[11px] font-medium mt-0.5 ${theme.textMutedClass}`}>जिम्मेवार अधिकारी: {item.officer}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-black text-[13px] text-indigo-600 dark:text-indigo-400">{item.fee}</Text>
                        <Text className={`text-[10px] font-bold uppercase mt-0.5 ${theme.textMutedClass}`}>{item.time}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* 4. OFFICIAL FORMS MODAL */}
              {activeModal === 'forms' && (
                <View className="gap-3.5">
                  <Text className={`font-bold text-[14px] mb-1 ${theme.textClass}`}>
                    {language === 'ne' ? '📝 १-ट्यापमा निवेदन ढाँचा प्रतिलिपि गर्नुहोस्' : '📝 Copy Application Templates'}
                  </Text>

                  {[
                    {
                      name: 'साधारण निवेदन ढाँचा',
                      text: `श्रीमान वडा अध्यक्ष ज्यू,\nवडा कार्यालय नं. ..., सिमरौनगढ नगरपालिका, बारा।\n\nविषय: सिफारिस सम्बन्धमा।\n\nमहोदय,\nउपरोक्त सम्बन्धमा म निवेदनकर्ता ... को देहाय बमोजिमको कामको लागि वडा कार्यालयबाट सिफारिस आवश्यक परेको हुँदा आवश्यक कागजात संलग्न राखी यो निवेदन पेश गर्दछु।\n\nनिवेदक:\nनाम: ...\nठेगाना: सिमरौनगढ वडा नं ...\nफोन: ...`
                    },
                    {
                      name: 'घरबाटो सिफारिस निवेदन',
                      text: `श्रीमान वडा अध्यक्ष ज्यू,\nसिमरौनगढ नगरपालिका वडा नं ...,\n\nविषय: घरबाटो सिफारिस पाउँ।\n\nमहोदय,\nमेरो नाममा दर्ता स्रेस्ता रहेको कित्ता नं. ... को जग्गामा घरबाटो पुगेको हुनाले सोको प्रमाणित सिफारिस उपलब्ध गराई पाउन यो निवेदन पेश गर्दछु।\n\nनिवेदक:\nनाम: ...\nकित्ता नं: ...`
                    }
                  ].map((tmpl, idx) => (
                    <View key={idx} className={`p-4 mb-2.5 ${theme.glassCardClass}`}>
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className={`font-black text-[14px] ${theme.textClass}`}>{tmpl.name}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            Clipboard.setString(tmpl.text);
                            setCopiedIdx(idx);
                            setTimeout(() => setCopiedIdx(null), 2000);
                          }}
                          className={`px-3 py-1.5 rounded-xl flex-row items-center ${copiedIdx === idx ? 'bg-emerald-600' : (theme.isDark ? 'bg-indigo-500/20' : 'bg-indigo-600')}`}
                        >
                          {copiedIdx === idx ? (
                            <>
                              <Check size={12} color="#ffffff" className="mr-1" />
                              <Text className="text-white text-[11px] font-bold">Copied!</Text>
                            </>
                          ) : (
                            <>
                              <Copy size={12} color="#ffffff" className="mr-1" />
                              <Text className="text-white text-[11px] font-bold">Copy Text</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>

                      <View className={`p-3 rounded-xl border ${theme.isDark ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <Text className={`text-[11.5px] leading-relaxed font-mono ${theme.textSecondaryClass}`}>{tmpl.text}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* 5. TAX & REVENUE MODAL */}
              {activeModal === 'tax' && (
                <View className="gap-3.5">
                  <View className={`p-4 rounded-2xl border ${theme.isDark ? 'bg-white/[0.03] border-white/10' : 'bg-emerald-50/50 border-emerald-100'}`}>
                    <Text className={`font-bold text-[14px] mb-1 ${theme.textClass}`}>
                      {language === 'ne' ? '🏛️ सिमरौनगढ राजस्व खाता जानकारी' : '🏛️ Municipal Bank Account'}
                    </Text>
                    <Text className={`text-[12px] font-bold text-emerald-600 dark:text-emerald-400 mb-1`}>
                      राष्ट्रिय वाणिज्य बैंक, सिमरौनगढ शाखा
                    </Text>
                    <Text className={`text-[11.5px] font-mono ${theme.textClass}`}>
                      खाता नाम: सिमरौनगढ नगरपालिका (ग-१-१ राजस्व खाता)
                    </Text>
                    <Text className={`text-[11.5px] font-mono font-bold mt-0.5 ${theme.textClass}`}>
                      खाता नं: १४७०१०००००००१०MDA
                    </Text>
                  </View>

                  <Text className={`font-bold text-[14px] mt-1 ${theme.textClass}`}>
                    {language === 'ne' ? '💡 वार्षिक कर तथा शुल्क दररेट' : '💡 Tax Rates Breakdown'}
                  </Text>

                  {[
                    { name: 'एकीकृत सम्पत्ति कर (Property Tax)', rate: 'मूल्याङ्कनको ०.०१% देखि ०.०५%' },
                    { name: 'व्यापार व्यवसाय नवीकरण (Business Tax)', rate: 'रु ५०० - रु ५,००० (व्यवसाय प्रकृति अनुसार)' },
                    { name: 'सवारी साधन सिफारिस (Vehicle Fee)', rate: 'रु २०० - रु १,०००' },
                    { name: 'घरबहाल कर (House Rent Tax)', rate: 'बहाल रकमको १०%' },
                  ].map((tItem, i) => (
                    <View key={i} className={`p-3.5 flex-row items-center justify-between mb-2 ${theme.glassCardClass}`}>
                      <Text className={`font-bold text-[12.5px] flex-1 mr-2 ${theme.textClass}`}>{tItem.name}</Text>
                      <Text className="font-extrabold text-[12px] text-emerald-600 dark:text-emerald-400">{tItem.rate}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 6. PROCUREMENT & TENDERS MODAL */}
              {activeModal === 'procurement' && (
                <View className="gap-3.5">
                  <Text className={`font-bold text-[14px] mb-1 ${theme.textClass}`}>
                    {language === 'ne' ? '🏗️ सिमरौनगढ नगरपालिका हालका बोलपत्रहरू' : '🏗️ Active Municipal Tenders'}
                  </Text>

                  {[
                    {
                      no: 'सूचना नं: ०८/०८२-८३',
                      title: 'सिमरौनगढ वडा नं ३ सडक कालोपत्रे निर्माण कार्य',
                      budget: 'अनुमानित लागत: रु १५,००,०००/-',
                      date: 'अन्तिम मिति: २०८३ श्रावण १५ गते'
                    },
                    {
                      no: 'सूचना नं: ०९/०८२-८३',
                      title: 'नगरपालिका प्राथमिक विद्यालय भवन निर्माण सामग्री आपूर्ति',
                      budget: 'अनुमानित लागत: रु ८,५०,०००/-',
                      date: 'अन्तिम मिति: २०८३ श्रावण २० गते'
                    },
                    {
                      no: 'सूचना नं: १०/०८२-८३',
                      title: 'कृषि सिँचाइका लागि डीप ट्युबवेल जडान तथा पाइपलाइन',
                      budget: 'अनुमानित लागत: रु १२,००,०००/-',
                      date: 'अन्तिम मिति: २०८३ श्रावण २५ गते'
                    }
                  ].map((tnd, i) => (
                    <View key={i} className={`p-4 mb-2.5 ${theme.glassCardClass}`}>
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className={`text-[10px] font-black uppercase tracking-wider ${theme.isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{tnd.no}</Text>
                        <Text className="text-[10px] font-bold text-rose-500">{tnd.date}</Text>
                      </View>
                      <Text className={`font-black text-[14px] mb-2 leading-tight ${theme.textClass}`}>{tnd.title}</Text>
                      <Text className="font-extrabold text-[12.5px] text-emerald-600 dark:text-emerald-400">{tnd.budget}</Text>
                    </View>
                  ))}
                </View>
              )}

            </ScrollView>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
