import React,{createContext,useCallback,useContext,useRef,useState} from 'react';

export type HomePage='today'|'calendar';
type HomePagerValue={page:HomePage;setPage:(page:HomePage)=>void;goToPage:(page:HomePage)=>void;registerPager:(navigate:(page:HomePage)=>void)=>()=>void};
const HomePagerContext=createContext<HomePagerValue|null>(null);

export function HomePagerProvider({children}:{children:React.ReactNode}){
 const [page,setPage]=useState<HomePage>('today');const navigateRef=useRef<((page:HomePage)=>void)|null>(null);
 const goToPage=useCallback((next:HomePage)=>{setPage(next);navigateRef.current?.(next);},[]);
 const registerPager=useCallback((navigate:(page:HomePage)=>void)=>{navigateRef.current=navigate;return()=>{if(navigateRef.current===navigate)navigateRef.current=null;}},[]);
 return <HomePagerContext.Provider value={{page,setPage,goToPage,registerPager}}>{children}</HomePagerContext.Provider>;
}
const standalone:HomePagerValue={page:'today',setPage:()=>{},goToPage:()=>{},registerPager:()=>()=>{}};
export function useHomePager(){return useContext(HomePagerContext)??standalone;}
