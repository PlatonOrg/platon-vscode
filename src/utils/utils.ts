export function capitalize(s: string): string {
    /** 
     * Capitalize the first letter of a string and lowercase the rest
     * @param s The string to capitalize
     * @returns The capitalized string
     */
    return s.charAt(0).toUpperCase() + s.slice(1).toLocaleLowerCase();
}