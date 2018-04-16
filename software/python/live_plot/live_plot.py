import sys
import time
import serial
import matplotlib
import matplotlib.pyplot as plt
import signal


class EM3242LivePlot(serial.Serial):

    ResetSleepDt = 0.5
    Baudrate = 115200

    def __init__(self,port='/dev/ttyACM0',timeout=10.0):
        param = {'baudrate': self.Baudrate, 'timeout': timeout}
        super(EM3242LivePlot,self).__init__(port,**param)
        time.sleep(self.ResetSleepDt)


        self.window_size = 10.0

        self.t_init =  time.time()
        self.t_list = []
        self.angle_list = []

        self.running = False
        signal.signal(signal.SIGINT, self.sigint_handler)

        plt.ion()
        self.fig = plt.figure(1)
        self.ax = plt.subplot(111) 
        self.angle_line, = plt.plot([0,1], [0,1],'b')
        plt.grid('on')
        plt.xlabel('t (sec)')
        plt.ylabel('angle (deg)')
        self.ax.set_xlim(0,self.window_size)
        self.ax.set_ylim(0,360)
        plt.title("EM3242 Angle Sensor ")
        self.angle_line.set_xdata([])
        self.angle_line.set_ydata([])
        self.fig.canvas.flush_events()


    def sigint_handler(self,signum,frame):
        self.running = False

    def run(self):


        self.write('b\n')
        self.running = True

        with open('data.txt', 'w') as fid:
            while self.running:
                have_data = False
                while self.in_waiting > 0:
                    line = self.readline()
                    have_data = True
                if have_data:
                    line = line.strip()
                    angle = float(line)
                    t_elapsed = time.time() - self.t_init
                    self.t_list.append(t_elapsed)
                    self.angle_list.append(angle)

                    while (self.t_list[-1] - self.t_list[0]) > self.window_size:
                        self.t_list.pop(0)
                        self.angle_list.pop(0)

                    self.angle_line.set_xdata(self.t_list)
                    self.angle_line.set_ydata(self.angle_list)
                    xmin = self.t_list[0]
                    xmax = max(self.window_size, self.t_list[-1])
                    self.ax.set_xlim(xmin,xmax)
                    self.fig.canvas.flush_events()
                    fid.write('{0} {1}\n'.format(t_elapsed, angle))
                    print(angle)

        print('quiting')
        self.write('e\n')



# ---------------------------------------------------------------------------------------
if __name__ == '__main__':

    if len(sys.argv) > 1:
        port = sys.argv[1]

    liveplot = EM3242LivePlot(port=port)
    liveplot.run()



