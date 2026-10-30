import {
    ProjectFormData,
    FormValidationErrors,
    ValidationSchema,
    PROJECT_FORM_VALIDATION_SCHEMA,
    ContentType,
} from '../types/project-form.types';

export const validateField = (
    fieldName: keyof ProjectFormData,
    value: any,
    schema: ValidationSchema = PROJECT_FORM_VALIDATION_SCHEMA
): string | undefined => {
    const rules = schema[fieldName];
    if (!rules) return undefined;

    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
        return `${formatFieldName(fieldName)} is required`;
    }

    if (!value || (typeof value === 'string' && !value.trim())) {
        return undefined;
    }

    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        return `${formatFieldName(fieldName)} must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        return `${formatFieldName(fieldName)} must be less than ${rules.maxLength} characters`;
    }

    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        return getPatternErrorMessage(fieldName);
    }

    if (rules.custom) {
        const customError = rules.custom(value);
        if (customError) return customError;
    }

    return undefined;
};

export const validateForm = (
    formData: ProjectFormData,
    schema: ValidationSchema = PROJECT_FORM_VALIDATION_SCHEMA
): FormValidationErrors => {
    const errors: FormValidationErrors = {};

    Object.keys(schema).forEach((key) => {
        const fieldName = key as keyof ProjectFormData;
        const value = formData[fieldName];
        const error = validateField(fieldName, value, schema);
        if (error) {
            if (fieldName in errors) {
                (errors as any)[fieldName] = error;
            }
        }
    });

    if (formData.advancedOptions.useCustomTechStack) {
        const techStackError = validateField(
            'customTechStack' as any,
            formData.advancedOptions.customTechStack,
            schema
        );
        if (techStackError) {
            errors.customTechStack = techStackError;
        }
    }

    return errors;
};

export const hasFormErrors = (errors: FormValidationErrors): boolean => {
    return Object.keys(errors).length > 0;
};

export const hasFieldError = (errors: FormValidationErrors, fieldName: keyof FormValidationErrors): boolean => {
    return !!errors[fieldName];
};

const formatFieldName = (fieldName: string): string => {
    const nameMap: Record<string, string> = {
        projectName: 'Project name',
        projectDescription: 'Description',
        websiteUrl: 'Website URL',
        contentTypes: 'Content type',
        targetAudience: 'Target audience',
        contentVelocity: 'Content velocity',
        projectLeadId: 'Project lead',
        customTechStack: 'Tech stack',
    };
    return nameMap[fieldName] || fieldName;
};

const getPatternErrorMessage = (fieldName: string): string => {
    const patternMessages: Record<string, string> = {
        projectName:
            'Project name can only contain letters, numbers, spaces, hyphens, and underscores',
        websiteUrl: 'Please enter a valid URL (e.g., https://example.com)',
    };
    return patternMessages[fieldName] || 'Invalid format';
};

export const normalizeUrl = (url: string): string => {
    if (!url) return url;
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
    }
    return trimmed;
};

export const extractDomain = (url: string): string | null => {
    try {
        const normalized = normalizeUrl(url);
        const urlObj = new URL(normalized);
        return urlObj.hostname;
    } catch {
        return null;
    }
};

export const getCharacterCount = (value: string, maxLength: number): {
    current: number;
    max: number;
    remaining: number;
    isNearLimit: boolean;
    isOverLimit: boolean;
    percentage: number;
} => {
    const current = value.length;
    const remaining = maxLength - current;
    const percentage = (current / maxLength) * 100;

    return {
        current,
        max: maxLength,
        remaining,
        isNearLimit: percentage >= 80 && percentage < 100,
        isOverLimit: current > maxLength,
        percentage,
    };
};

export const isFormValid = (formData: ProjectFormData, errors: FormValidationErrors): boolean => {
    return !hasFormErrors(errors);
};

export const isFieldTouched = (touchedFields: Set<keyof ProjectFormData>, fieldName: keyof ProjectFormData): boolean => {
    return touchedFields.has(fieldName);
};

export const markFieldTouched = (
    touchedFields: Set<keyof ProjectFormData>,
    fieldName: keyof ProjectFormData
): Set<keyof ProjectFormData> => {
    const newSet = new Set(touchedFields);
    newSet.add(fieldName);
    return newSet;
};

export const hasContentTypeSelected = (contentTypes: ContentType[]): boolean => {
    return contentTypes && contentTypes.length > 0;
};

export const toggleContentType = (contentTypes: ContentType[], typeToToggle: ContentType): ContentType[] => {
    const isSelected = contentTypes.includes(typeToToggle);
    if (isSelected) {
        return contentTypes.filter((type) => type !== typeToToggle);
    } else {
        return [...contentTypes, typeToToggle];
    }
};

export const addTeamMember = (memberIds: string[], memberIdToAdd: string): string[] => {
    if (memberIds.includes(memberIdToAdd)) {
        return memberIds;
    }
    return [...memberIds, memberIdToAdd];
};

export const removeTeamMember = (memberIds: string[], memberIdToRemove: string): string[] => {
    return memberIds.filter((id) => id !== memberIdToRemove);
};

export const hasTeamMember = (memberIds: string[], memberId: string): boolean => {
    return memberIds.includes(memberId);
};

export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
};
