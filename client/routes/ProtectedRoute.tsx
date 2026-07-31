import { Navigate } from "react-router-dom";
import { getToken, remove } from "../utils/token";
import { useEffect, useState } from "react";
import api from "../api/axios";


interface Props {
    children: JSX.Element;
}


export default function ProtectedRoute({ children }: Props) {

    const [loading, setLoading] = useState(true);
    const [valid, setValid] = useState(false);


    useEffect(()=>{

        const checkToken = async()=>{

            const token = getToken();

            if(!token){
                setValid(false);
                setLoading(false);
                return;
            }


            try{

                await api.get("/auth/me");

                setValid(true);

            }catch(error){

                remove();

                setValid(false);

            }


            setLoading(false);

        };


        checkToken();

    },[]);



    if(loading){

        return null;

    }


    if(!valid){

        return <Navigate to="/" replace />;

    }


    return children;

}