"use client";

import Image from "next/image";
import { Controller, useFormContext } from "react-hook-form";
import { ProofidentFormData } from "@/lib/onboarding/schemas";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
  FieldSeparator,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DATA_SOURCES, SUPPORTED_BANKS } from "@/lib/onboarding/steps";
import { useCallback, useState } from "react";
import { NEXT_PUBLIC_MONO_PUBLIC_KEY } from "@/lib/envVariables";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import BettingDropzone, { UploadHandler } from "@/components/onboarding/BettingDropzone";

function StarRating({ count }: { count: number }) {
  return (
    <span className='text-amber-500 text-xs tracking-tighter'>
      {"★".repeat(count)}
      <span className='text-zinc-700'>{"★".repeat(5 - count)}</span>
    </span>
  );
}

const bankDataAndId = {};

export function DataSourcesStep({
  onBettingUpload = async () => {},
}: {
  onBettingUpload?: UploadHandler;
}) {
  const [activeBettingId, setActiveBettingId] = useState<string | null>(null);
  const { control } = useFormContext<ProofidentFormData>();
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Somehhow when we signup or sign-in, the name and email will be readily available from
  // next-auth, the below is just a placeholder
  const customer = {
    name: "Samuel Olumide",
    email: "samuel.olumide@gmail.com",
  };

  const openMonoWidget = useCallback(async (institutionId: string) => {
    const MonoConnect = (await import("@mono.co/connect.js")).default;

    const monoInstance = new MonoConnect({
      key: NEXT_PUBLIC_MONO_PUBLIC_KEY,
      data: { customer },
      onClose: () => console.log("Widget closed"),
      onLoad: () => setScriptLoaded(true),
      onSuccess: async ({ code }: { code: string }) =>
        // Send code to the server endpoint
        console.log(`Linked successfully: ${code}`),
    });

    const config = {
      selectedInstitution: {
        id: institutionId,
      },
    };
    monoInstance.setup(institutionId !== "" ? config : null);
    monoInstance.open();
  }, []);

  const onClickHandler = (id: string) => {
    // Call that of Betting platforms here
    const isBetting = DATA_SOURCES.find(
  (cat) =>
    cat.category === "betting platforms" &&   // ← was "betting institutions"
    cat.institutions.some((inst) => inst.id === id),
);

    if (isBetting) {
      // Toggle the dropzone open/closed for this betting source
      setActiveBettingId((prev) => (prev === id ? null : id));
      return;
    }

    if (id in SUPPORTED_BANKS) {
      openMonoWidget(SUPPORTED_BANKS[id]);
    }
  };
  return (
    <div className='space-y-5 font-inter'>
      <div className='p-3 rounded-lg bg-black/10 border border-black/40 flex gap-2'>
        <p className=''>
          <Info className='text-black size-6' />
        </p>
        <p className='text-black text-xs leading-relaxed flex-1'>
          You can skip all of these and use self-declared info only — but
          connecting at least one source increases your score confidence
          significantly.
        </p>
      </div>

      <Controller
        name='dataSources'
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel className='text-zinc-300 text-sm font-medium sr-only'>
              Data Sources
            </FieldLabel>

            <div
              className='space-y-10'
              role='group'
              aria-label='Select data sources'
            >
              {DATA_SOURCES.map((source) => {
                return (
                  <div className='flex flex-col gap-5'>
                    <div>
                      <FieldSeparator className='uppercase text-black/80 font-medium'>
                        {source.category}
                      </FieldSeparator>
                    </div>
                    <div className='space-y-3'>
                      {source.institutions.map((institution) => (
                        <button
                          key={institution.id}
                          type='button'
                          role='checkbox'
                          onClick={() => onClickHandler(institution.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-150",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 bg-black",
                          )}
                        >
                          {/* Icon */}
                          <Image
                            src={institution.image}
                            alt={`${institution.label} logo`}
                            width={32}
                            height={32}
                            className='rounded-full object-center object-cover'
                          />

                          {/* Info */}
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2 flex-wrap'>
                              <span className='text-white text-sm font-medium'>
                                {institution.label}
                              </span>
                              {institution.badge && (
                                <span className='text-[9px] font-bold bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-widest'>
                                  {institution.badge}
                                </span>
                              )}
                            </div>
                            <div className='flex items-center gap-2 mt-0.5'>
                              <span className='text-white/70 text-xs'>
                                {institution.description}
                              </span>
                              <StarRating count={institution.stars} />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Field>
        )}
      />
      {/* Betting dropzone dialog — rendered once, controlled by activeBettingId */}
      {(() => {
        const activeBettingSource = DATA_SOURCES.flatMap(
          (cat) => cat.institutions,
        ).find((inst) => inst.id === activeBettingId);

        return (
          <Dialog
            open={activeBettingId !== null}
            onOpenChange={(open) => {
              if (!open) setActiveBettingId(null);
            }}
          >
            <DialogContent className='sm:max-w-md'>
              <DialogHeader>
                <DialogTitle className='flex items-center gap-2'>
                  {activeBettingSource && (
                    <Image
                      src={activeBettingSource.image}
                      alt={activeBettingSource.label}
                      width={24}
                      height={24}
                      className='rounded-full object-cover'
                    />
                  )}
                  {activeBettingSource?.label} Transaction History
                </DialogTitle>
                <DialogDescription>
                  Upload your betting slips or transaction history screenshots.
                  Files are uploaded immediately on drop.
                </DialogDescription>
              </DialogHeader>

              {activeBettingSource && (
                <BettingDropzone
                  source={activeBettingSource}
                  onUpload={onBettingUpload}
                />
              )}
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
