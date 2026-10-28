import {
  DESCRIPTION_MAX_LENGTH,
  TAGS_MAX_COUNT,
  countCharacters,
  normalizeTags,
} from '@flash/shared';
import { useId } from 'react';

/** Optional description and tags. Tags are previewed as they will be saved. */
export function PostDetailsFields({
  description,
  onDescriptionChange,
  tagsInput,
  onTagsChange,
  errors = {},
}) {
  const descriptionId = useId();
  const tagsId = useId();
  const remaining = DESCRIPTION_MAX_LENGTH - countCharacters(description);
  const { tags, invalid } = normalizeTags(tagsInput);

  return (
    <section
      className="space-y-4 rounded-lg border border-line bg-canvas p-6"
      aria-labelledby={`${descriptionId}-title`}
    >
      <h2
        id={`${descriptionId}-title`}
        className="font-headline text-sm font-semibold tracking-wider text-ink uppercase"
      >
        Details (optional)
      </h2>

      <div>
        <label htmlFor={descriptionId} className="mb-1.5 block text-xs font-medium text-ink">
          Description
        </label>
        <textarea
          id={descriptionId}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          rows={3}
          aria-invalid={remaining < 0 || Boolean(errors.description)}
          aria-describedby={`${descriptionId}-hint`}
          placeholder="Light, place, story or technique behind the shot..."
          className="field p-3"
        />
        <p
          id={`${descriptionId}-hint`}
          className={`mt-1 font-mono text-[11px] ${remaining < 0 ? 'font-semibold text-danger' : 'text-muted'}`}
        >
          {errors.description || `${remaining} characters remaining`}
        </p>
      </div>

      <div>
        <label htmlFor={tagsId} className="mb-1.5 block text-xs font-medium text-ink">
          Tags (comma separated, up to {TAGS_MAX_COUNT})
        </label>
        <input
          id={tagsId}
          type="text"
          value={tagsInput}
          onChange={(event) => onTagsChange(event.target.value)}
          aria-invalid={invalid.length > 0 || Boolean(errors.tags)}
          aria-describedby={`${tagsId}-hint`}
          placeholder="street, monochrome, night"
          className="field p-2.5"
        />
        <div id={`${tagsId}-hint`} className="mt-2 space-y-1">
          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Tags that will be saved">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-[2px] bg-primary-soft/30 px-2 py-0.5 font-mono text-[11px] text-primary"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          )}
          {invalid.length > 0 && (
            <p className="text-[11px] text-danger">
              These tags will not be accepted: {invalid.join(', ')}. Use letters, numbers, - or _
              (max 30 characters, {TAGS_MAX_COUNT} tags).
            </p>
          )}
          {errors.tags && <p className="text-[11px] text-danger">{errors.tags}</p>}
        </div>
      </div>
    </section>
  );
}
