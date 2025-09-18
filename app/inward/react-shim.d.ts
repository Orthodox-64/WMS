// Minimal local shims to satisfy TypeScript for the inward section only.
// This file is referenced explicitly by page.tsx and won't affect other files.

declare module 'react' {
  export const useEffect: any;
  export const useState: any;
  export const useMemo: any;
  export const useCallback: any;
  export const useRef: any;
  const React: any;
  export default React;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// Shims for modules used in this page
declare module 'next/image' {
  const Image: any;
  export default Image;
}

declare module 'next/navigation' {
  export const useRouter: any;
}

declare module 'lucide-react' {
  export const Search: any;
  export const Download: any;
  export const Plus: any;
  export const Edit: any;
  export const Trash2: any;
  export const Eye: any;
}

declare module 'firebase/firestore' {
  export const collection: any;
  export const getDocs: any;
  export const query: any;
  export const where: any;
  export const addDoc: any;
  export const updateDoc: any;
  export const doc: any;
  export const deleteDoc: any;
  export const getDoc: any;
}
