import React, { useState } from 'react';
import { nanoid } from 'nanoid';
import { Severity, SiteType, CreateReportPayload, CreateReportResponse } from '../types';
import { uploadImageToS3, createReport } from '../services/api';
import {
  X,
  MapPin,
  Camera,
  Navigation,
  Upload,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Loader2,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface SubmitReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated: (result: CreateReportResponse, lat: number, lng: number) => void;
  pickedCoords?: { lat: number; lng: number } | null;
  onStartMapPick: () => void;
}

export const SubmitReportModal: React.FC<SubmitReportModalProps> = ({
  isOpen,
  onClose,
  onReportCreated,
  pickedCoords,
  onStartMapPick,
}) => {
  const [latitude, setLatitude] = useState<string>(
    pickedCoords ? String(pickedCoords.lat) : '12.9716'
  );
  const [longitude, setLongitude] = useState<string>(
    pickedCoords ? String(pickedCoords.lng) : '77.5946'
  );
  const [severity, setSeverity] = useState<Severity>('critical');
  const [siteType, setSiteType] = useState<SiteType>('road');
  const [description, setDescription] = useState<string>('');
  const [isDemo, setIsDemo] = useState<boolean>(true); // default demo for safe testing
  const [coordsSource, setCoordsSource] = useState<'default' | 'gps' | 'map'>('default');

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<CreateReportResponse | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Sync picked coordinates when user clicked on map
  React.useEffect(() => {
    if (pickedCoords) {
      setLatitude(String(pickedCoords.lat));
      setLongitude(String(pickedCoords.lng));
      setCoordsSource('map');
    }
  }, [pickedCoords]);

  // Browser Geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(5));
        setLongitude(pos.coords.longitude.toFixed(5));
        setCoordsSource('gps');
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        setErrorMessage(`Location access error: ${err.message}. You can enter coordinates manually or pick on map.`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Image Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image file exceeds the 5MB size limit.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMessage(null);
  };

  const removeFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setErrorMessage('Please enter a valid latitude (-90 to 90).');
      return;
    }

    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setErrorMessage('Please enter a valid longitude (-180 to 180).');
      return;
    }

    setIsSubmitting(true);
    const reportId = `rpt_${nanoid(10)}`;

    try {
      let imageKey: string | undefined = undefined;

      // 1. Direct S3 Upload if image provided
      if (selectedFile) {
        setSubmissionStep('Uploading photograph directly to private S3...');
        imageKey = await uploadImageToS3(selectedFile, reportId);
      }

      // 2. Submit Report payload to AWS backend
      setSubmissionStep('Computing server-side risk triage score via AWS Lambda...');
      const payload: CreateReportPayload = {
        report_id: reportId,
        reportId: reportId,
        severity,
        site_type: siteType,
        siteType: siteType,
        latitude: latNum,
        longitude: lngNum,
        description: description.trim() || undefined,
        image_key: imageKey,
        imageKey: imageKey,
        is_demo: isDemo,
        isDemo: isDemo,
      };

      const result = await createReport(payload);
      setSuccessResult(result);
      setSubmissionStep('Report successfully triaged and persisted in DynamoDB!');

      // Notify parent after brief display
      setTimeout(() => {
        onReportCreated(result, latNum, lngNum);
        onClose();
        // Reset modal state
        setIsSubmitting(false);
        setSuccessResult(null);
        setSelectedFile(null);
        setPreviewUrl(null);
        setDescription('');
        setCoordsSource('default');
      }, 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm overflow-y-auto ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none hidden'
      }`}
    >
      <div className="w-full max-w-xl bg-white border border-[#E6E8EC] rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-4 border-b border-[#E6E8EC] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F4F1] flex items-center justify-center text-[#157A70]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#17191C]">Report Blocked Storm Drain</h3>
              <p className="text-[11px] text-[#696F78]">
                Trigger real-time AWS risk scoring and municipal dispatch triage
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setSelectedFile(null);
              setPreviewUrl(null);
              setDescription('');
              setCoordsSource('default');
              onClose();
            }}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-[#696F78] hover:text-[#17191C] hover:bg-[#F5F6F8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Splash */}
        {successResult ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#F0FDF4] border-2 border-[#16A34A] flex items-center justify-center text-[#16A34A] mx-auto animate-bounce">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-base font-bold text-[#17191C]">Incident Triaged Successfully!</h4>
              <p className="text-xs text-[#696F78] mt-1">
                Report ID: <span className="font-mono text-[#157A70] font-semibold">{successResult.report_id}</span>
              </p>
            </div>

            <div className="p-4 bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl max-w-md mx-auto space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#696F78]">Calculated Risk Score:</span>
                <span className="text-[#157A70] font-bold text-base">{successResult.risk_score} / 100</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#696F78]">Assigned Priority Tier:</span>
                <span className="text-[#B45309] font-bold uppercase">{successResult.priority}</span>
              </div>
              <p className="text-[11px] text-[#696F78] pt-2 border-t border-[#E6E8EC] text-left font-mono">
                {successResult.explanation}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-[#FDF2F2] border border-[#F8D7D7] rounded-xl text-[#C5282A] text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Coordinates Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#17191C] uppercase tracking-wider flex items-center justify-between">
                <span>Location Coordinates</span>
                <span className="text-[10px] text-[#9298A1] font-normal">Decimal lat/lon</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-[#696F78]">Latitude</span>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => {
                      setLatitude(e.target.value);
                      setCoordsSource('default');
                    }}
                    required
                    className="w-full bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl px-3 py-1.5 text-xs text-[#17191C] font-mono focus:border-[#157A70] focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#696F78]">Longitude</span>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => {
                      setLongitude(e.target.value);
                      setCoordsSource('default');
                    }}
                    required
                    className="w-full bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl px-3 py-1.5 text-xs text-[#17191C] font-mono focus:border-[#157A70] focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              {coordsSource === 'map' && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#157A70] font-medium bg-[#E8F4F1] border border-[#157A70]/20 px-2.5 py-1 rounded-xl">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Pin selected on map: ({latitude}, {longitude})</span>
                </div>
              )}
              {coordsSource === 'gps' && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#0284C7] font-medium bg-[#F0F7FF] border border-[#BAE6FD] px-2.5 py-1 rounded-xl">
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span>Location retrieved from GPS: ({latitude}, {longitude})</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={geoLoading}
                  className="flex-1 py-1.5 px-3 bg-white hover:bg-[#F5F6F8] text-[#17191C] rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-[#E6E8EC] shadow-xs cursor-pointer"
                >
                  {geoLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#157A70]" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5 text-[#0284C7]" />
                  )}
                  Use Current Location
                </button>

                <button
                  type="button"
                  onClick={onStartMapPick}
                  className="flex-1 py-1.5 px-3 bg-white hover:bg-[#F5F6F8] text-[#17191C] rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-[#E6E8EC] shadow-xs cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#157A70]" />
                  Select Point on Map
                </button>
              </div>
            </div>

            {/* Severity Radio Group */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#17191C] uppercase tracking-wider">
                Blockage Severity
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'critical', label: 'Critical', weight: '100%', selectedStyle: 'border-[#D9383A] text-[#C5282A] bg-[#FDF2F2] ring-1 ring-[#D9383A]/30 font-semibold' },
                  { id: 'high', label: 'High', weight: '75%', selectedStyle: 'border-[#D97706] text-[#B45309] bg-[#FEF3C7] ring-1 ring-[#D97706]/30 font-semibold' },
                  { id: 'medium', label: 'Medium', weight: '45%', selectedStyle: 'border-[#CA8A04] text-[#A16207] bg-[#FEF9C3] ring-1 ring-[#CA8A04]/30 font-semibold' },
                  { id: 'low', label: 'Low', weight: '20%', selectedStyle: 'border-[#16A34A] text-[#15803D] bg-[#F0FDF4] ring-1 ring-[#16A34A]/30 font-semibold' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSeverity(s.id as Severity)}
                    className={`p-2 rounded-xl text-xs font-medium border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      severity === s.id
                        ? s.selectedStyle
                        : 'border-[#E6E8EC] bg-white text-[#696F78] hover:border-[#D1D5DB]'
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className="text-[10px] opacity-75 font-mono">{s.weight}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Site / Exposure Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#17191C] uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#157A70]" /> Site Exposure Category
              </label>
              <select
                value={siteType}
                onChange={(e) => setSiteType(e.target.value as SiteType)}
                className="w-full bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl px-3 py-2 text-xs text-[#17191C] focus:border-[#157A70] focus:bg-white focus:outline-none transition-all"
              >
                <option value="road">Arterial Road (Highest flood impact · 100%)</option>
                <option value="commercial">Commercial Market (High density · 75%)</option>
                <option value="residential">Residential Area (Homes & streets · 60%)</option>
                <option value="footpath">Pedestrian Walkway (Moderate impact · 35%)</option>
                <option value="park">Park / Open Ground (Absorption capacity · 15%)</option>
              </select>
            </div>

            {/* Photo Upload with Direct Presigned S3 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#17191C] uppercase tracking-wider flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-[#157A70]" /> Photograph Evidence (Optional)
              </label>

              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-[#E6E8EC] bg-[#F5F6F8] aspect-video max-h-40">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeFile}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white font-mono">
                    {selectedFile?.name} ({(selectedFile?.size || 0) / 1024 < 1000 ? `${Math.round((selectedFile?.size || 0) / 1024)} KB` : `${((selectedFile?.size || 0) / (1024 * 1024)).toFixed(1)} MB`})
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-[#D1D5DB] hover:border-[#157A70] bg-[#F5F6F8]/60 hover:bg-[#E8F4F1]/30 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                  <Upload className="w-5 h-5 text-[#9298A1] group-hover:text-[#157A70] transition-colors mb-1" />
                  <span className="text-xs text-[#17191C] font-medium">
                    Click to select photo or drag here
                  </span>
                  <span className="text-[10px] text-[#9298A1]">
                    JPEG, PNG, WebP up to 5MB (stored directly in private AWS S3)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#17191C] uppercase tracking-wider">
                Descriptive Notes (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Observed standing water, silt accumulation, debris type..."
                className="w-full bg-[#F5F6F8] border border-[#E6E8EC] rounded-xl p-2.5 text-xs text-[#17191C] placeholder-[#9298A1] focus:border-[#157A70] focus:bg-white focus:outline-none transition-all"
              ></textarea>
            </div>

            {/* Synthetic Demo checkbox */}
            <div className="pt-2 border-t border-[#E6E8EC] flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-[#696F78] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDemo}
                  onChange={(e) => setIsDemo(e.target.checked)}
                  className="rounded border-[#D1D5DB] text-[#157A70] focus:ring-0"
                />
                <Sparkles className="w-3.5 h-3.5 text-[#157A70]" />
                <span>Mark as Synthetic Demo Record</span>
              </label>
            </div>

            {/* Submission Button & Status */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#157A70] hover:bg-[#11685F] disabled:bg-[#D1D5DB] text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{submissionStep || 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-white" />
                    <span>Submit Report for Risk Triage</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
