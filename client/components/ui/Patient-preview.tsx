import React from 'react';

export interface ProfilePreviewDetail {
  label: string;
  value?: string | null;
}

export interface ProfilePreviewProps {
  name: string;
  emptyNameFallback?: string;
  chips?: (string | null | undefined)[];
  details: ProfilePreviewDetail[];
  photoDataUrl?: string;
}

// Generic side-panel preview — works for any person record (patient, doctor,
// staff, ...). Callers pass a name, optional badge chips, and a label/value
// list of whatever details are relevant to that entity.
const ProfilePreview: React.FC<ProfilePreviewProps> = ({
  name,
  emptyNameFallback = 'New record',
  chips = [],
  details,
  photoDataUrl,
}) => {
  const dash = (value?: string | null): string => (value && value.trim() ? value : '—');

  const displayName = name && name.trim() ? name : emptyNameFallback;
  const visibleChips = chips.filter((c): c is string => Boolean(c && c.trim()));

  const UserIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );

  return (
    <aside className="preview" aria-label="Profile preview">
      <style>{`
        .preview {
          position: sticky;
          top: 24px;
          background: #FFFFFF;
          border: 1px solid #BFDBFE;
          border-radius: 10px;
          overflow: hidden;
        }

        .preview .band {
          background: linear-gradient(90deg, #0B1D3A 0%, #1E3A5F 30%, #2E6DA4 60%, #3B82F6 100%);
          height: 64px;
          position: relative;
        }

        .preview .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #DBEAFE;
          border: 4px solid #fff;
          display: grid;
          place-items: center;
          position: absolute;
          left: 20px;
          bottom: -40px;
          background-size: cover;
          background-position: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .preview .avatar svg {
          width: 48px;
          height: 48px;
          color: #1E40AF;
        }

        .preview .body {
          padding: 50px 20px 20px;
        }

        .preview h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 17px;
          font-weight: 600;
          min-height: 22px;
          color: #1E3A5F;
          margin: 0 0 12px 0;
        }

        .preview .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 12px 0 14px;
        }

        .chip {
          font-size: 11.5px;
          font-weight: 600;
          background: #DBEAFE;
          color: #1E40AF;
          border-radius: 999px;
          padding: 3px 10px;
        }

        .preview dl {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 6px 12px;
          font-size: 12.5px;
        }

        .preview dt {
          color: #64748B;
        }

        .preview dd {
          font-weight: 500;
          text-align: right;
          word-break: break-all;
          margin: 0;
        }

        @media (max-width: 860px) {
          .preview {
            position: static;
            order: -1;
          }
        }
      `}</style>

      <div className="band">
        <div className="avatar" style={photoDataUrl ? { backgroundImage: `url("${photoDataUrl}")` } : {}}>
          {!photoDataUrl && <UserIcon />}
        </div>
      </div>

      <div className="body">
        <h2>{displayName}</h2>

        {visibleChips.length > 0 && (
          <div className="chips">
            {visibleChips.map((chip, i) => (
              <span key={i} className="chip">{chip}</span>
            ))}
          </div>
        )}

        <dl>
          {details.map((d, i) => (
            <React.Fragment key={i}>
              <dt>{d.label}</dt>
              <dd>{dash(d.value)}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    </aside>
  );
};

export default ProfilePreview;
