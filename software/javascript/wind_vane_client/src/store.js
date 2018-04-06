"use strict";
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex);

export const store = new Vuex.Store({
  state: {
    socket: null,
    datetime: null,
    angle: 0,
    numberOfSamples: 0,
    loggingState: {
      enabled: false,
      fileName: '',
    }
  },

  mutations: {

    setSocket(state, socket) {
      state.socket = socket;
    },
    
    setAngle(state, angle) {
      state.angle = angle;
    },

    setNumberOfSamples(state, numberOfSamples) {
      state.numberOfSamples = numberOfSamples;
    },

    setDateTime(state, datetime) {
      state.datetime = datetime;
    },

    setLoggingState(state, loggingState) {
      state.loggingState = loggingState;
    }
  }

})


