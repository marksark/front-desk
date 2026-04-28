import { useCallback, useEffect, useMemo, useState } from "react";
import validator from "@rjsf/validator-ajv8";
import FormWithWidgets from "../json-form-builder/forms/FormWithWidgets.jsx";
import { useTenant } from "../tenant/TenantContext";

interface FormTemplate {
  jsonSchema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
}

type SubmissionState = "idle" | "submitting" | "submitted";

interface IntakeFormPageProps {
  persistentNavTarget: {
    href: string;
    label: string;
  };
}

export function IntakeFormPage({ persistentNavTarget }: IntakeFormPageProps) {
  const { tenantId } = useTenant();
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmissionState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const tenantLabel = useMemo(
    () => tenantId
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    [tenantId]
  );

  const loadTemplate = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setTemplate(null);
    setSubmitState("idle");
    setSubmitError(null);

    try {
      const response = await fetch(`/api/form-template/${encodeURIComponent(tenantId)}`);
      if (response.status === 404) {
        setLoadError("This school has not published an intake form yet.");
        return;
      }
      if (!response.ok) {
        throw new Error("Unable to load intake form.");
      }

      const payload = (await response.json()) as { template: FormTemplate };
      setTemplate(payload.template);
      setFormData({});
    } catch {
      setLoadError("Could not load the intake form. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  const submitForm = async ({ formData: nextFormData }: { formData?: unknown }) => {
    if (submitState === "submitting") {
      return;
    }

    const payload = typeof nextFormData === "object" && nextFormData !== null && !Array.isArray(nextFormData)
      ? nextFormData as Record<string, unknown>
      : {};

    setSubmitState("submitting");
    setSubmitError(null);

    try {
      const response = await fetch(`/api/form-submissions/${encodeURIComponent(tenantId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: payload })
      });

      if (!response.ok) {
        throw new Error("Unable to submit intake form.");
      }

      setSubmitState("submitted");
      setFormData({});
    } catch {
      setSubmitState("idle");
      setSubmitError("Could not submit the form. Please try again.");
    }
  };

  return (
    <>
      <main className="intake-page">
        <section className="intake-shell">
          <header className="intake-header">
            <p className="intake-kicker">{tenantLabel}</p>
            <h1>Family Intake Form</h1>
            <p>Share the details our team needs before we follow up.</p>
          </header>

          <section className="intake-card">
            {isLoading ? <p>Loading intake form...</p> : null}

            {!isLoading && loadError ? (
              <div className="intake-empty">
                <h2>Form unavailable</h2>
                <p>{loadError}</p>
              </div>
            ) : null}

            {!isLoading && template && submitState === "submitted" ? (
              <div className="intake-success" role="status">
                <h2>Thanks, we received your form.</h2>
                <p>Our front desk team will review it and follow up soon.</p>
                <button type="button" onClick={() => setSubmitState("idle")}>
                  Submit another response
                </button>
              </div>
            ) : null}

            {!isLoading && template && submitState !== "submitted" ? (
              <>
                {submitError ? <p className="intake-error">{submitError}</p> : null}
                <FormWithWidgets
                  schema={template.jsonSchema}
                  uiSchema={template.uiSchema}
                  formData={formData}
                  validator={validator}
                  liveValidate
                  onChange={({ formData: nextFormData }: { formData?: unknown }) => {
                    if (
                      typeof nextFormData === "object" &&
                      nextFormData !== null &&
                      !Array.isArray(nextFormData)
                    ) {
                      setFormData(nextFormData as Record<string, unknown>);
                    }
                  }}
                  onSubmit={submitForm}
                >
                  <button
                    className="intake-submit-button"
                    type="submit"
                    disabled={submitState === "submitting"}
                  >
                    {submitState === "submitting" ? "Submitting..." : "Submit Intake Form"}
                  </button>
                </FormWithWidgets>
              </>
            ) : null}
          </section>
        </section>
      </main>
      <a className="persistent-nav-button" href={persistentNavTarget.href}>
        {persistentNavTarget.label}
      </a>
    </>
  );
}
