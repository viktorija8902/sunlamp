import React from 'react';
import { Text, StyleSheet } from 'react-native';

export const Message = ({ successMessage, error, turnedOff }) => {
  let text = "";
  if (successMessage !== "") {
    text = successMessage;
  } else if (error) {
    text = "Error!";
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
