import React from 'react'
import './Offers.css';
import products from '../../products.json'
import { useState } from 'react';

import { Navigation, Pagination, A11y, EffectCoverflow} from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';



const Offers = () => {
  const [offerproducts, setofferproducts] = useState(products)
  const [count, setcount] = useState(0)

  const incrementProductQuantity =(id) =>{ 
    setcount(count + 1)
    offerproducts[id].count = offerproducts[id].count + 1;
    // setofferproducts(offerproducts[id].count + 1)
  };

  const decrementProductQuantity =(id) =>{
    setcount(count -1)
    offerproducts[id].count = offerproducts[id].count - 1;
    // setofferproducts(offerproducts[id].count -1)

  } ;
  return (
    <section className='offers' id='offer'>
        <div className="container">
          <h1>Offers</h1>
              <Swiper className='swiper'
                  modules={[
                  Navigation,
                  Pagination,
                  EffectCoverflow,
                  A11y
                  ]}
                  spaceBetween={50}
                  navigation={true}
                  autoplay
                  pagination={{ clickable: true }}
                  effect="coverflow"
                  grabCursor={true}
                  slidesPerView={'5'}
                  centeredSlides={false}
                  coverflowEffect={{
                  rotate: 30,
                  stretch: 0,
                  depth: 50,
                  modifier: .5,
                  slideShadows: true,
                  }}
              >
            {offerproducts.map((product, index) =>{
              return(
                <SwiperSlide className="card" key={index}>
                  <img src={require(`../../image/${product.img}`)} alt="" />
                  <div className="card-details">
                  <div className='prod-det'>
                    <h2>{product.name}</h2>
                    <p>{product.desc}</p>
                  </div>
                  <div className="price">
                    <p>السعر{product.price}</p>
                    <div className="count">
                      <button className='symb' onClick={()=>decrementProductQuantity(index)}>-</button>
                      <span className='num'>{product.count<1?0:product.count}</span>
                      <button className='symb' onClick={()=>incrementProductQuantity(index)}>+</button>
                    </div>
                  </div>
                    <div className='add_cart'>
                      <button>اضف الي طلباتي</button>
                    </div>
                  </div>
                </SwiperSlide>
              )})}
          </Swiper>
          
        </div>
    </section>
  )
}
export   default Offers