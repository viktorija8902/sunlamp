/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import { Text, Platform, View, StyleSheet, Picker, Button } from 'react-native';
import BluetoothSerial from 'react-native-bluetooth-serial';


const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
  android:
    'Double tap R on your keyboard to reload u,\n' +
    'Shake or press menu button for dev menu',
});

type Props = {};
export default class App extends Component<Props> {
  state = {
        workdayHour: "",
        workdayMinute: "",
        holidayHour: "",
        holidayMinute: "",
        showSuccessIcon: false,
        turnedOff: false,
        error: false,
        connectionStatus: "connecting",
  };

  workdaysBinary = "10111110";
  workdayBitmask = parseInt(this.workdaysBinary, 2);
  holidayBinary = "11000001";
  holidayBitmask = parseInt(this.holidayBinary, 2);
  maxBrightness = 255;
  minBrightness = 0;
  brightenPerSecond = 0.10;
  darkenPerSecond = 10;
  numberOfSchedules = 4; //turn-off and turn-on schedule

  componentDidMount() {
    // console.log("mounted")
    BluetoothSerial.withDelimiter('\n').then(() => {
        this.handleResponses();
    });

    return this.connectToDevice().then(connected => {
          if (connected) {
            console.log("getting schedules")
            BluetoothSerial.write("gsc\n")
          }
    });
  }

  componentWillUnMount() {
    BluetoothSerial.disconnect();
  }

  handleResponses = () => {
    BluetoothSerial.on('read', (response) => {
      console.log('Reading data: ', response)
      const responseArray = response.data.split(" ");
      const schedulesReceived = responseArray[0] === "ACK" && responseArray.length > 2;
      const lampTurnedOff = "ACK 0\r\n";
      const scheduleSet = responseArray[0] === "ACK\r\n" && responseArray.length === 1;
      const error = response.data.startsWith("ERR");
      if (error) {
        this.setState({
          error: true,
          turnedOff: false,
          showSuccessIcon: false,
        });
      }
      else if (scheduleSet) {
        this.setState({
            error: false,
            turnedOff: false,
            showSuccessIcon: true,
        });
      } else if (response.data === lampTurnedOff) {
          this.setState({
            error: false,
            turnedOff: true,
            showSuccessIcon: false,
          });
      } else if (schedulesReceived) {
        const schedules = this.formSchedules(response.data);
        const turnOnSchedules = [schedules[0], schedules[2]];
        let workdayHour, workdayMinute, holidayHour, holidayMinute;
        turnOnSchedules.forEach(s => {
          console.log("Schedule", s)
          if (s[0] === this.workdayBitmask.toString()) {
            workdayHour = s[1];
            workdayMinute = s[2];
          } else if (s[0] === this.holidayBitmask.toString()) {
            holidayHour = s[1];
            holidayMinute = s[2];
          }
        })
        console.log(workdayHour, workdayMinute)
        console.log(holidayHour, holidayMinute)
        this.setState({
          workdayHour: parseInt(workdayHour),
          workdayMinute: parseInt(workdayMinute),
          holidayHour: parseInt(holidayHour),
          holidayMinute: parseInt(holidayMinute),
        });
      }
    });
  }

  formSchedules = data => {
    let schedules = [];
    let schedule = [];
    let schedulesArray = data.split(" ").slice(2);
    schedulesArray.forEach(n => {
      if (schedule.length === 4 ) {
        schedule = schedule.concat(n);
        schedules = schedules.concat([schedule]);
        schedule = [];
      } else {
        schedule = schedule.concat(n);
      }
    })
    return schedules;
  }

   connectToDevice = () => {
       this.setState({
         connectionStatus: "connecting",
       })
      return BluetoothSerial.list()
         .then(data => {
            console.log("devices", data)
            const id = data.find(device => device.name === "SUNLAMP").id;
            return BluetoothSerial.connect(id)
         }).then(()=> {
              this.setState({
                 connectionStatus: "connected"
              })
              return true;
         }).catch(error => {
              console.error("connection error", error)
              this.setState({
                 connectionStatus: "not-connected"
              })
              return false;
         })
    }


  renderOptionsFrom = options =>
    options.map(option => <Picker.Item key={option.toString()} label={option.toString()} value={option} />);

  renderDefaultValue = value => <Picker.Item label={`Select ${value}`} value="not selected"/>;

  turnOff = () => {
    console.log("CLICKED")
    return BluetoothSerial.isConnected()
      .then(connected => {
        if (connected) {
          BluetoothSerial.write("sdl 0\n");
        } else {
          return this.connectToDevice().then(connected => {
            if (connected) {
              BluetoothSerial.write("sdl 0\n");
            }
          })
        }
      });
  }

  setSchedule = () => {
    return BluetoothSerial.isConnected()
        .then(connected => {
            if (connected) {
//                this.sendWorkdaySchedule();
//                this.sendHolidaySchedule();
                this.sendSchedules()
            } else {
                return this.connectToDevice().then(connected => {
                   if (connected) {
                        this.sendSchedules();
//                        this.sendWorkdaySchedule();
//                        this.sendHolidaySchedule();
                   }
                });
            }
        })
  }

  sendSchedules() {
       const workdayTurnOnSchedule = `${this.state.workdayHour} ${this.state.workdayMinute} ${this.maxBrightness} ${this.brightenPerSecond}`;
       const workdayTurnOffSchedule = `${this.getTurnOffHour(this.state.workdayHour)} ${this.state.workdayMinute} ${this.minBrightness} ${this.darkenPerSecond}`;
       //BluetoothSerial.write(`ssc ${this.numberOfSchedules} ${this.workdayBitmask} ${workdayTurnOnSchedule} ${this.workdayBitmask} ${workdayTurnOffSchedule}\n`);

       const holidayTurnOnSchedule = `${this.state.holidayHour} ${this.state.holidayMinute} ${this.maxBrightness} ${this.brightenPerSecond}`;
       const holidayTurnOffSchedule = `${this.getTurnOffHour(this.state.holidayHour)} ${this.state.holidayMinute} ${this.minBrightness} ${this.darkenPerSecond}`;
       console.log()
       BluetoothSerial.write(
            `ssc ${this.numberOfSchedules} ${this.holidayBitmask} ${holidayTurnOnSchedule} ${this.holidayBitmask} ${holidayTurnOffSchedule}
            ${this.workdayBitmask} ${workdayTurnOnSchedule} ${this.workdayBitmask} ${workdayTurnOffSchedule}\n`);
  }

  sendWorkdaySchedule() {
     const workdayTurnOnSchedule = `${this.state.workdayHour} ${this.state.workdayMinute} ${this.maxBrightness} ${this.brightenPerSecond}`;
     const workdayTurnOffSchedule = `${this.getTurnOffHour(this.state.workdayHour)} ${this.state.workdayMinute} ${this.minBrightness} ${this.darkenPerSecond}`;
     BluetoothSerial.write(`ssc ${this.numberOfSchedules} ${this.workdayBitmask} ${workdayTurnOnSchedule} ${this.workdayBitmask} ${workdayTurnOffSchedule}\n`);
  }

  sendHolidaySchedule() {
     const holidayTurnOnSchedule = `${this.state.holidayHour} ${this.state.holidayMinute} ${this.maxBrightness} ${this.brightenPerSecond}`;
     const holidayTurnOffSchedule = `${this.getTurnOffHour(this.state.holidayHour)} ${this.state.holidayMinute} ${this.minBrightness} ${this.darkenPerSecond}`;
     BluetoothSerial.write(`ssc ${this.numberOfSchedules} ${this.holidayBitmask} ${holidayTurnOnSchedule} ${this.holidayBitmask} ${holidayTurnOffSchedule}\n`);
  }

  getTurnOffHour = hour => {
    if (hour === 23) {
        return 0;
    } else {
        return hour + 1;
    }
  }

  render() {
    if (this.state.connectionStatus === "connecting") {
      return <View style={styles.container}>
        <Text style={styles.welcome}>Connecting...</Text>
      </View>
    }
    if (this.state.connectionStatus === "not-connected") {
          return <View style={styles.container}>
            <Text style={styles.welcome}>Failed to connect!</Text>
            <Button
              onPress={this.connectToDevice}
              title="Try again"
              color="#841584"
              accessibilityLabel="Try connecting again"
            />
          </View>
    }

    const hours = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];//[...Array(24).fill().keys()];
    const minutes = [0,5,10,15,20,25,30,35,40,45,50,55];//...Array(60).fill().keys()];
    const minuteOptions = this.renderOptionsFrom(minutes);
    const hoursOptions = this.renderOptionsFrom(hours);
    const hourDefault = this.renderDefaultValue("hour")
    const minuteDefault = this.renderDefaultValue("minute")

    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>Welcome to Lamp Control!</Text>
        <Button
          onPress={this.turnOff}
          title="Turn Off Lamp"
          color="#841584"
          accessibilityLabel="Learn more about this purple button"
        />

        {this.state.showSuccessIcon && <Text style={styles.welcome}>Set!</Text>}
        {this.state.error && <Text style={styles.welcome}>Error!</Text>}
        {this.state.turnedOff && <Text style={styles.welcome}>Turned Off!</Text>}
        <Text>Workday schedule</Text>
        <Picker
          selectedValue={this.state.workdayHour}
          mode="dropdown"
          style={styles.picker}
          onValueChange={itemValue => this.setState({ workdayHour: itemValue })}
          >
          {hourDefault}
          {hoursOptions}
        </Picker>
         <Picker
          selectedValue={this.state.workdayMinute}
          mode="dropdown"
          style={styles.picker}
          onValueChange={itemValue => this.setState({ workdayMinute: itemValue })}
          >
          {minuteDefault}
          {minuteOptions}
        </Picker>

        <Text>Holiday schedule</Text>
        <Picker
          selectedValue={this.state.holidayHour}
          mode="dropdown"
          style={styles.picker}
          onValueChange={itemValue => this.setState({ holidayHour: itemValue })}
          >
          {hourDefault}
          {hoursOptions}
        </Picker>
         <Picker
          selectedValue={this.state.holidayMinute}
          mode="dropdown"
          style={styles.picker}
          onValueChange={itemValue => this.setState({ holidayMinute: itemValue })}
          >
          {minuteDefault}
          {minuteOptions}
        </Picker>


        <Button
          onPress={this.setSchedule}
          title="Set schedule"
          color="#841584"
          accessibilityLabel="Set schedule"
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
   picker: {
      height: 70,
      width: 200,
    },
});
