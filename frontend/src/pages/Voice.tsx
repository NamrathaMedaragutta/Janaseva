import {
  CheckCircle2,
  ClipboardCopy,
  Info,
  Mic,
  PhoneCall,
  PhoneOff,
  RotateCcw,
  SearchCheck,
  Square,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Checkbox, Field, Select, TextArea, TextInput } from "../components/Field";
import { SectionCard } from "../components/SectionCard";
import { Alert } from "../components/States";
import { useI18n } from "../i18n";
import { getErrorMessage, publicApi, voiceApi } from "../services/api";
import type { Category, PublicMeta, VoiceSession, VoiceStatus } from "../types";
import { cn } from "../utils/cn";

type Stage = "idle" | "describe" | "confirm" | "done";

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function VoicePage() {
  const { t, pick, lang } = useI18n();
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [meta, setMeta] = useState<PublicMeta | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [callLanguage, setCallLanguage] = useState(lang === "kn" ? "kn" : "en");
  const [callerNumber, setCallerNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [draft, setDraft] = useState("");
  const [confidence, setConfidence] = useState<number | undefined>(undefined);
  const [categoryId, setCategoryId] = useState("");
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    voiceApi.status().then(setVoiceStatus).catch(() => setVoiceStatus(null));
    publicApi.meta().then(setMeta).catch(() => setMeta(null));
    return () => recognitionRef.current?.abort();
  }, []);

  const startSession = async () => {
    setStarting(true);
    setError(null);
    setNotice(null);
    try {
      const created = await voiceApi.start({
        language_code: callLanguage,
        caller_number: callerNumber.trim() || undefined,
        consent_to_contact: consent,
      });
      setSession(created);
      setDraft("");
      setConfidence(undefined);
      setCategoryId("");
      setStage("describe");
    } catch (err) {
      setError(getErrorMessage(err) || t("voice.startError"));
    } finally {
      setStarting(false);
    }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const startRecording = () => {
    setError(null);
    setNotice(null);
    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice(t("voice.unsupported"));
      return;
    }

    try {
      const recognition = new Recognition();
      recognition.lang = callLanguage === "kn" ? "kn-IN" : "en-IN";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let finalText = "";
        let interim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const alternative = result[0];
          if (result.isFinal) {
            finalText += alternative.transcript;
            if (alternative.confidence) setConfidence(Number(alternative.confidence.toFixed(2)));
          } else {
            interim += alternative.transcript;
          }
        }
        if (finalText) setDraft((current) => `${current} ${finalText}`.trim());
        else if (interim) setDraft((current) => current || interim.trim());
      };
      recognition.onerror = (event) => {
        setRecording(false);
        if (event.error === "no-speech") setNotice(t("voice.noSpeech"));
        else if (event.error === "not-allowed" || event.error === "service-not-allowed")
          setNotice(t("voice.unsupported"));
        else setError(t("voice.failure"));
      };
      recognition.onend = () => {
        setRecording(false);
        if (!draft.trim()) setNotice(t("voice.noSpeech"));
      };
      recognitionRef.current = recognition;
      recognition.start();
      setRecording(true);
    } catch {
      setNotice(t("voice.unsupported"));
    }
  };

  const proceedToConfirm = async () => {
    if (!session) return;
    if (draft.trim().length < 10) {
      setError(t("register.descriptionHint"));
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const updated = await voiceApi.transcript(session.id, draft.trim(), confidence);
      setSession(updated);
      setCategoryId(updated.suggested_category?.id ?? "");
      setDraft(updated.transcript ?? draft);
      setStage("confirm");
      if (updated.failure_reason === "low_confidence") setNotice(t("voice.lowConfidence"));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const submitComplaint = async () => {
    if (!session || !meta) return;
    setWorking(true);
    setError(null);
    try {
      const updated = await voiceApi.submit(session.id, {
        hospital_id: meta.hospital.id,
        description: draft.trim(),
        category_id: categoryId || undefined,
        consent_to_contact: consent,
      });
      setSession(updated);
      setStage("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const reset = () => {
    stopRecording();
    recognitionRef.current = null;
    setSession(null);
    setStage("idle");
    setDraft("");
    setConfidence(undefined);
    setCategoryId("");
    setError(null);
    setNotice(null);
    setCopied(false);
  };

  const copyReference = async () => {
    if (!session?.complaint_reference) return;
    await navigator.clipboard.writeText(session.complaint_reference);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  const steps: { key: Stage; label: string }[] = [
    { key: "idle", label: t("voice.step1") },
    { key: "describe", label: t("voice.step2") },
    { key: "confirm", label: t("voice.step3") },
  ];
  const activeStep = stage === "done" ? 3 : stage === "confirm" ? 2 : stage === "describe" ? 1 : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-info">{t("landing.eyebrow")}</p>
        <h1 className="mt-1.5 text-2xl font-bold text-brand sm:text-3xl">{t("voice.title")}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">{t("voice.lead")}</p>
      </div>

      {voiceStatus && !voiceStatus.live && (
        <Alert tone="warning" className="mb-5 flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t("voice.demoBanner")}</span>
        </Alert>
      )}
      {voiceStatus?.live && (
        <Alert tone="success" className="mb-5">
          {t("voice.liveBanner")}
        </Alert>
      )}

      <ol className="mb-5 grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm",
              index <= activeStep
                ? "border-brand/30 bg-white font-semibold text-brand"
                : "border-line/70 bg-page text-ink-soft",
            )}
          >
            <span
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                index <= activeStep ? "bg-brand text-white" : "bg-line/50 text-white",
              )}
            >
              {index + 1}
            </span>
            {step.label}
          </li>
        ))}
      </ol>

      {error && (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      )}
      {notice && stage !== "done" && (
        <Alert tone="warning" className="mb-4">
          {notice}
        </Alert>
      )}

      {stage === "idle" && (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title={t("voice.startCall")} subtitle={t("voice.ivrNote")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("register.languageLabel")} htmlFor="call-language" required>
                <Select
                  id="call-language"
                  value={callLanguage}
                  onChange={(event) => setCallLanguage(event.target.value)}
                  aria-label={t("register.languageLabel")}
                >
                  <option value="kn">{t("common.kannada")}</option>
                  <option value="en">{t("common.english")}</option>
                </Select>
              </Field>
              <Field label={t("register.phoneLabel")} htmlFor="caller-number" hint={t("register.phoneHint")}>
                <TextInput
                  id="caller-number"
                  value={callerNumber}
                  onChange={(event) => setCallerNumber(event.target.value)}
                  inputMode="tel"
                  placeholder="+91"
                  maxLength={20}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Checkbox
                id="call-consent"
                checked={consent}
                onChange={setConsent}
                label={t("voice.consentLabel")}
                description={t("register.ackNote")}
              />
            </div>
            <div className="mt-5">
              <Button
                size="lg"
                onClick={startSession}
                loading={starting}
                icon={<PhoneCall className="h-[18px] w-[18px]" aria-hidden="true" />}
              >
                {starting ? t("voice.starting") : t("voice.startCall")}
              </Button>
            </div>
          </SectionCard>

          <div className="space-y-4">
            <div className="rounded-xl border border-line/70 bg-brand p-5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                {t("voice.callNumber")}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold">1800-000-000</p>
              <p className="mt-2 text-xs leading-relaxed text-white/70">{t("landing.helplineNote")}</p>
              <ul className="mt-4 space-y-2 text-[13px] text-white/85">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#9BD3C6]" aria-hidden="true" />
                  {t("landing.voicePoint1")}
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#9BD3C6]" aria-hidden="true" />
                  {t("landing.voicePoint3")}
                </li>
              </ul>
            </div>
            <div className="card p-4 text-xs leading-relaxed text-ink-soft">
              <p className="font-semibold text-brand">{t("voice.suggested")}</p>
              <p className="mt-1">
                Complaints are categorised from the spoken words using a transparent rule set. If the match is
                uncertain, the grievance is sent to the administrator review queue.
              </p>
            </div>
          </div>
        </div>
      )}

      {stage !== "idle" && stage !== "done" && session && (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <SectionCard
            title={stage === "describe" ? t("voice.step2") : t("voice.step3")}
            subtitle={`${pick("Call language", "ಕರೆ ಭಾಷೆ")}: ${
              session.language_code === "kn" ? t("common.kannada") : t("common.english")
            } · ${session.provider_call_id}`}
          >
            {stage === "describe" && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  {!recording ? (
                    <Button
                      onClick={startRecording}
                      icon={<Mic className="h-4 w-4" aria-hidden="true" />}
                      disabled={working}
                    >
                      {t("voice.speakNow")}
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      onClick={stopRecording}
                      icon={<Square className="h-4 w-4" aria-hidden="true" />}
                    >
                      {t("voice.stopRecording")}
                    </Button>
                  )}
                  <span className="text-xs text-ink-soft">
                    {recording ? (
                      <span className="inline-flex items-center gap-2 font-medium text-danger">
                        <span className="recording-ring relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
                        {t("voice.recording")}
                      </span>
                    ) : (
                      t("voice.manualHint")
                    )}
                  </span>
                </div>

                <div className="mt-4">
                  <Field
                    label={t("voice.manualLabel")}
                    htmlFor="transcript"
                    hint={t("voice.manualHint")}
                    required
                  >
                    <TextArea
                      id="transcript"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      className={callLanguage === "kn" ? "kannada" : undefined}
                      lang={callLanguage === "kn" ? "kn" : "en"}
                      placeholder={
                        callLanguage === "kn"
                          ? "ಉದಾಹರಣೆ: ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಔಷಧಿ ಸಿಗುತ್ತಿಲ್ಲ..."
                          : "For example: The prescribed medicine was not available..."
                      }
                      maxLength={4000}
                    />
                  </Field>
                  {confidence !== undefined && (
                    <p className="mt-1.5 text-[11px] text-ink-soft">
                      {pick("Recognition confidence", "ಗುರುತಿಸುವಿಕೆ ವಿಶ್ವಾಸ")}: {Math.round(confidence * 100)}%
                      {confidence < 0.45 && <span className="ml-2 font-semibold text-warning">{t("voice.lowConfidence")}</span>}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    onClick={proceedToConfirm}
                    loading={working}
                    icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                  >
                    {t("common.next")}
                  </Button>
                  <Button variant="ghost" onClick={reset} icon={<PhoneOff className="h-4 w-4" aria-hidden="true" />}>
                    {t("voice.endCall")}
                  </Button>
                </div>
              </>
            )}

            {stage === "confirm" && (
              <>
                <div className="rounded-lg border border-line/70 bg-page p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                    {t("voice.manualLabel")}
                  </p>
                  <p className={cn("mt-1 whitespace-pre-wrap text-sm leading-relaxed text-brand", callLanguage === "kn" && "kannada")}>
                    {draft}
                  </p>
                  {confidence !== undefined && (
                    <p className="mt-2 text-[11px] text-muted">
                      {pick("Captured confidence", "ಸೆರೆಹಿಡಿದ ವಿಶ್ವಾಸ")}: {Math.round(confidence * 100)}%
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <Field label={t("voice.categoryLabel")} htmlFor="voice-category" required>
                    <Select
                      id="voice-category"
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                    >
                      <option value="">{t("register.departmentAuto")}</option>
                      {(meta?.categories ?? []).map((category: Category) => (
                        <option key={category.id} value={category.id}>
                          {pick(category.name_en, category.name_kn)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {session.suggested_category && (
                    <p className="mt-1.5 text-xs text-ink-soft">
                      {t("voice.suggested")}: <span className="font-semibold text-brand">{pick(session.suggested_category.name_en, session.suggested_category.name_kn)}</span>
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <label className="field-label" htmlFor="confirm-text">
                    {t("voice.manualLabel")}
                  </label>
                  <TextArea
                    id="confirm-text"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className={callLanguage === "kn" ? "kannada" : undefined}
                    lang={callLanguage === "kn" ? "kn" : "en"}
                    maxLength={4000}
                  />
                  <p className="mt-1 text-[11px] text-muted">{t("voice.manualHint")}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    onClick={submitComplaint}
                    loading={working}
                    icon={<PhoneCall className="h-4 w-4" aria-hidden="true" />}
                  >
                    {working ? t("voice.submitting") : t("voice.submit")}
                  </Button>
                  <Button variant="secondary" onClick={() => setStage("describe")} icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}>
                    {t("common.back")}
                  </Button>
                </div>
              </>
            )}
          </SectionCard>

          <aside className="space-y-4">
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t("voice.callNumber")}</p>
              <p className="mt-1 font-mono text-lg font-semibold text-brand">{voiceStatus?.phone_number ?? "1800-000-000"}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">{t("voice.ivrNote")}</p>
            </div>
            <div className="rounded-xl border border-line/70 bg-white p-4">
              <p className="text-xs font-semibold text-brand">{t("voice.unsupported")}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                {pick(
                  "You can type the complaint instead. An assisted registration at the help desk is always available.",
                  "ಬದಲಾಗಿ ದೂರನ್ನು ಟೈಪ್ ಮಾಡಬಹುದು. ಸಹಾಯ ಕೇಂದ್ರದಲ್ಲಿ ಸಹಾಯದ ನೋಂದಣಿ ಯಾವಾಗಲೂ ಲಭ್ಯ.",
                )}
              </p>
              <Link to="/register" className="mt-2 inline-block text-xs font-semibold text-info link-underline">
                {t("nav.report")} →
              </Link>
            </div>
          </aside>
        </div>
      )}

      {stage === "done" && session?.complaint_reference && (
        <div className="mx-auto max-w-2xl">
          <div className="card overflow-hidden">
            <div className="bg-success px-5 py-6 text-white sm:px-7">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
              <h2 className="mt-3 text-xl font-bold">{t("voice.successTitle")}</h2>
              <p className="mt-1.5 text-sm text-white/85">{t("voice.successLead")}</p>
            </div>
            <div className="p-5 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                {t("register.referenceLabel")}
              </p>
              <p className="mt-1.5 break-all font-mono text-2xl font-bold text-brand sm:text-3xl">
                {session.complaint_reference}
              </p>
              <p className="mt-3 text-xs text-ink-soft">
                {session.demo_mode ? t("voice.demoBanner").split(".")[0] + "." : t("voice.liveBanner")}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={copyReference} icon={<ClipboardCopy className="h-4 w-4" aria-hidden="true" />}>
                  {copied ? t("common.copied") : t("register.copyId")}
                </Button>
                <Link to={`/track?id=${encodeURIComponent(session.complaint_reference)}`}>
                  <Button variant="secondary" icon={<SearchCheck className="h-4 w-4" aria-hidden="true" />}>
                    {t("register.trackNow")}
                  </Button>
                </Link>
                <Button variant="ghost" onClick={reset} icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}>
                  {t("voice.newCall")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
