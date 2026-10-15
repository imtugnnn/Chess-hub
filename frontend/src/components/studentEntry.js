export const emptyStudentValues = () => ({ fullName: '', birthDate: '', parentName: '', parentPhoneNumber: '', phoneNumber: '', notes: '', studentId: null });

export function studentSuggestionValues(student) {
  return { ...emptyStudentValues(), ...Object.fromEntries(['fullName', 'birthDate', 'parentName', 'parentPhoneNumber', 'phoneNumber', 'notes'].map(key => [key, student[key] ?? ''])), studentId: student.id };
}

// Enter advances a field; Shift+Enter retains multiline notes and IME composition.
export function advanceStudentField(event, onComplete) {
  if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.nativeEvent?.isComposing || event.isComposing) return;
  const target = event.target;
  if (!target.matches('input, textarea, select')) return;
  event.preventDefault();
  if (!target.checkValidity()) { target.reportValidity(); return; }
  const fields = [...event.currentTarget.querySelectorAll('input, textarea, select')].filter(field => !field.disabled && !field.readOnly);
  const next = fields[fields.indexOf(target) + 1];
  if (next) next.focus(); else onComplete?.();
}
