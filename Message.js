import React from 'react';
import { Text, StyleSheet } from 'react-native';

export const Message = ({ showSuccessIcon, error, turnedOff }) => {
  let text = "";
  if (showSuccessIcon) {
    text = "Set!";
  } else if (error) {
    text = "Error!";
  } else if (turnedOff) {
    text = "Turned Off!";
  }

  return <Text style={styles.welcome}>{text}</Text>  
}

const styles = StyleSheet.create({
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
});
