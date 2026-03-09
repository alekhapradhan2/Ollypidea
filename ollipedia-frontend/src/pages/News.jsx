import { useEffect,useState } from "react";
import { API } from "../api/api";

export default function News(){

const [news,setNews] = useState([]);

useEffect(()=>{
API.getNews().then(setNews)
},[])

return(

<div>

<h1>Movie News</h1>

{news.map(n=>(

<div key={n._id}>

<h3>{n.title}</h3>

<p>{n.content}</p>

</div>

))}

</div>

)
}