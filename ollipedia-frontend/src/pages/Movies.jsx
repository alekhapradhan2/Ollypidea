import { useEffect, useState } from "react";

const API = "https://ollypidea.onrender.com/api";

export default function Movies(){

const [movies,setMovies] = useState([]);

useEffect(()=>{
fetch(`${API}/movies`)
.then(res=>res.json())
.then(data=>setMovies(data))
},[])

return(

<div style={{padding:"40px"}}>

<h1>All Movies</h1>

{movies.map(m=>(

<div key={m._id}>

<h2>{m.title}</h2>

<p>{m.director}</p>

</div>

))}

</div>

)

}