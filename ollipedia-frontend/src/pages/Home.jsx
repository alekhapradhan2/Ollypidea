import { useEffect, useState } from "react";
import { API } from "../api/api";
import MovieCard from "../components/MovieCard";

export default function Movies(){

const [movies,setMovies] = useState([]);

useEffect(()=>{
API.getMovies().then(setMovies)
},[])

return(

<div>

<h1>All Movies</h1>

{movies.map(m=>(

<MovieCard key={m._id} movie={m}/>

))}

</div>

)
}