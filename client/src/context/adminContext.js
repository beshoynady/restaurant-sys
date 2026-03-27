import { createContext,useContext, useState, useEffect } from "react";
import { AppContext } from "./appContext";
import axios from "axios";

export const AdminContext = createContext();

export const AdminContextProvider = ({ children }) => {
    const{apiUrl} = useContext(AppContext);
    const [brand, setBrand] = useState({})

    const fetchBrand = async () => {
        try {
            const response = await axios.get(`${apiUrl}/api/brand`);
            if (response.data) {
                setBrand(response.data);
                console.log("Brand data fetched successfully:", response.data);
            }
        } catch (error) {
            console.error("Error fetching brand data:", error);
        }
    };

    useEffect(() => {
        fetchBrand();
    }, [apiUrl]);

    return (
        <AdminContext.Provider value={{ brand }}>
            {children}
        </AdminContext.Provider>
    );
};
